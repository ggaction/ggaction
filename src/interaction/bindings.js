import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray } from "../core/ownData.js";
import { validateUserId } from "../core/identifiers.js";
import { normalizeSelectionProjection, projectSelectionKeys, selectionProjectionBudget } from "../grammar/selectionProjection.js";
import { resolveRegisteredSelection } from "../materialization/selection/expression.js";
import { requireMaterializedDataset } from "../selectors/datasets.js";
import { interactionOptions as options, snapshotInteractionInput } from "./input.js";
import { interactionOwner, prepareInteractionEdit, scopeSelectionKeys } from "./selection.js";

const ownerKey = target => JSON.stringify([target.childPath, target.id, target.facetSource === true]);
const same = (left, right) => {
  const keys = new Set(right);
  return left.length === right.length && left.every(key => keys.has(key));
};

export function normalizeSelectionLinks(program, input) {
  ownArray(input, "Selection links");
  if (input.length > 256) throw new RangeError("Selection links exceed the binding limit.");
  input = snapshotInteractionInput(input, "Selection links");
  const ids = new Set(), writers = new Map();
  let sources = 0;
  const links = input.map(value => {
    const request = options(value,
      ["type", "id", "sources", "target", "selection", "resolve"], [], "Selection link");
    const id = validateUserId(request.id, "Selection link id");
    if (request.type !== "linkSelection" || ids.has(id)) throw new TypeError("Selection links require unique IDs and linkSelection type.");
    ids.add(id);
    if (!["union", "intersection", "global"].includes(request.resolve)) throw new TypeError("Unknown linked selection resolution.");
    const target = interactionOwner(program, request.target).target, key = ownerKey(target);
    if (writers.has(key)) throw new Error("A linked target owner can have only one writer.");
    const selection = validateUserId(request.selection, "Linked target selection");
    ownArray(request.sources, "Selection link sources");
    sources += request.sources.length;
    if (!request.sources.length || sources > 256 || (request.resolve === "global" && request.sources.length !== 1)) {
      throw new RangeError("Selection links require bounded nonempty sources; global requires one source owner.");
    }
    const seen = new Set();
    const normalized = request.sources.map(source => {
      const entry = options(source, ["target", "selection", "projection"], [], "Selection link source");
      const target = interactionOwner(program, entry.target).target;
      const selection = validateUserId(entry.selection, "Linked source selection");
      const identity = JSON.stringify([ownerKey(target), selection]);
      if (seen.has(identity)) throw new Error("Linked source selections must be distinct.");
      seen.add(identity);
      return { target, selection, projection: normalizeSelectionProjection(entry.projection) };
    });
    const link = { id, target, selection, resolve: request.resolve, sources: normalized };
    writers.set(key, link); return link;
  });
  // Bounded Kahn traversal; each explicit owner is a single writer node.
  const pending = new Set(links), ordered = [], done = new Set();
  while (pending.size) {
    const ready = [...pending].filter(link => link.sources.every(source => !writers.has(ownerKey(source.target)) || done.has(ownerKey(source.target))));
    if (!ready.length) throw new Error("Linked selection bindings cannot contain cycles.");
    for (const link of ready) { pending.delete(link); done.add(ownerKey(link.target)); ordered.push(link); }
  }
  return cloneAndFreeze(ordered);
}

function endpoint(program, target, selection) {
  const { view } = interactionOwner(program, target);
  const resolved = resolveRegisteredSelection(view, selection, { sourceOnly: target.facetSource === true });
  if (resolved.definition.target !== target.id) throw new Error("Linked selection must match its explicit owner target.");
  if (resolved.definition.sourceSelection) throw new Error("A linked endpoint requires an authored selection owner, not a generated projection.");
  return { view, resolved };
}


function projectLink(program, link, spend) {
  const target = endpoint(program, link.target, link.selection);
  const sources = link.sources.map(source => {
    const selected = endpoint(program, source.target, source.selection);
    const datasets = source.projection.type === "rows" ? {
      sourceData: requireMaterializedDataset(selected.view, source.projection.sourceData),
      targetData: requireMaterializedDataset(target.view, source.projection.targetData)
    } : {};
    return { target: source.target, selection: source.selection,
      keys: projectSelectionKeys({ sourceItems: selected.resolved.items, sourceKeys: selected.resolved.keys,
        targetItems: target.resolved.items, projection: source.projection, ...datasets }, spend) };
  });
  const sets = sources.map(source => new Set(source.keys));
  spend(target.resolved.items.length * sets.length);
  const keys = target.resolved.items.filter(item => link.resolve === "intersection"
    ? sets.every(set => set.has(item.key)) : sets.some(set => set.has(item.key))).map(item => item.key);
  return { target, projection: { id: link.id, target: link.target, selection: link.selection, resolve: link.resolve,
    sources: sources.map(source => ({ ...source, keys: scopeSelectionKeys(program, link.target, source.keys, spend) })),
    keys: scopeSelectionKeys(program, link.target, keys, spend) }, keys };
}

export function inspectSelectionLinks(program, links, spend = selectionProjectionBudget()) {
  return cloneAndFreeze(links.map(link => projectLink(program, link, spend).projection));
}

export function applySelectionLinks(program, links, previous, affectedOwners, command) {
  if (command.type !== "setParameter") {
    const { target } = interactionOwner(program, command.target);
    if (links.some(link => ownerKey(link.target) === ownerKey(target) && link.selection === command.payload.id)) {
      throw new Error("A linked target selection is owned by its binding.");
    }
  }
  const changed = new Set(affectedOwners.map(ownerKey)), owners = [...affectedOwners], projections = [];
  const spend = selectionProjectionBudget();
  for (const [index, link] of links.entries()) {
    const projected = projectLink(program, link, spend), before = previous[index];
    const affected = link.sources.some(source => changed.has(ownerKey(source.target))) ||
      projected.projection.sources.some((source, position) => !same(source.keys, before.sources[position].keys));
    if (affected && !same(projected.keys, projected.target.resolved.keys)) {
      const prepared = prepareInteractionEdit(program, { type: "select", target: link.target,
        payload: { id: link.selection, select: { items: projected.projection.keys, empty: "none", grain: projected.target.resolved.definition.grain } } });
      program = prepared.program;
      const key = ownerKey(link.target);
      if (!changed.has(key)) owners.push(link.target);
      changed.add(key);
    }
    projections.push(projected.projection);
  }
  const settled = inspectSelectionLinks(program, links, spend);
  if (settled.some((link, index) => link.sources.some((source, position) => !same(source.keys, projections[index].sources[position].keys)))) {
    throw new Error("Linked selection effects changed an earlier projection; a cyclic materialization dependency is unsupported.");
  }
  return { program, affectedOwners: cloneAndFreeze(owners), projections: settled };
}
