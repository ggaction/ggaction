import { requireProgram } from "./hitProgram.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { encodeValue } from "../core/valueEncoding.js";
import { MAX_HIT_INDEX_ITEMS } from "../grammar/hitIndex.js";
import { validateWorkLimit, validateGeneratedItemLimit } from "../core/validation.js";
import { resolveRegisteredSelection } from "../materialization/selection/expression.js";
import { requireStoredResource } from "../selectors/resources.js";
import { interactionOwner, prepareInteractionEdit, scopeSelectionKeys } from "./selection.js";

const identity = value => JSON.stringify([value.target.childPath, value.target.id, value.target.facetSource === true, value.selection]);
const unique = keys => [...new Set(keys)];
export function normalizeSelectionPolicy(policy = "keep-hidden") {
  if (!["keep-hidden", "drop"].includes(policy)) throw new TypeError("Selection policy must be keep-hidden or drop.");
  return policy;
}
function budget() {
  let work = 0;
  return count => validateWorkLimit(work += count, "Selection lifecycle work");
}
function keysWork(keys, spend) {
  spend(keys.length);
  for (const key of keys) spend(key.length);
  return keys;
}
function definitions(program, spend) {
  const found = [], pending = [{ view: program, path: [] }];
  while (pending.length) {
    const { view, path } = pending.pop(); spend(path.length + 1);
    const facetSource = view.compositionSpec?.type === "facet";
    for (const [selection, definition] of Object.entries(view.materializationConfigs.selections ?? {})) {
      spend(selection.length + 1);
      if (definition.sourceSelection) continue;
      validateGeneratedItemLimit(found.length + 1, "Selection lifecycle records", MAX_HIT_INDEX_ITEMS);
      found.push({ target: { childPath: path, id: definition.target, ...(facetSource ? { facetSource: true } : {}) }, selection });
    }
    if (!facetSource) for (const [id, child] of Object.entries(view.children)) {
      spend(id.length); pending.push({ view: child, path: [...path, id] });
    }
  }
  return found;
}
function capture(program, owner, spend, policy) {
  const { view } = interactionOwner(program, owner.target), definition = view.materializationConfigs.selections[owner.selection];
  const resource = requireStoredResource(view, definition.resource);
  const signature = canonicalJSON(encodeValue({ grain: definition.grain, options: resource.options })); spend(signature.length);
  if (owner.target.facetSource && resource.options.mode === "predicate" && Object.hasOwn(resource.options.predicate, "property")) {
    if (policy === "drop") throw new Error("Selection drop cannot infer concrete-property membership for a facet source.");
    return { ...owner, grain: definition.grain, signature, availableKeys: [], selectedKeys: [], intentKeys: [], hiddenKeys: [], missing: false };
  }
  const resolved = resolveRegisteredSelection(view, owner.selection, { sourceOnly: owner.target.facetSource === true, membership: true });
  const available = new Set(); let represented = false;
  for (const item of resolved.items) if (item.visible !== false) {
    represented ||= item.representationKeys !== undefined;
    for (const key of keysWork([item.key, ...(item.representationKeys ?? [])], spend)) available.add(key);
  }
  const availableKeys = [...available];
  // Explicit keys remain the lifecycle identity while a different visible item
  // represents them. Hit/selection resolution continues to return current keys.
  const intentKeys = keysWork(resolved.selector.items?.length ? [...resolved.selector.items] : [...resolved.keys], spend);
  const selectedKeys = keysWork((represented && resolved.selector.items?.length ? intentKeys : resolved.keys).filter(key => available.has(key)), spend);
  return { ...owner, grain: resolved.definition.grain, signature, availableKeys, selectedKeys, intentKeys, hiddenKeys: [], missing: false };
}
function compare(current, previous, policy, spend) {
  const sameIntent = previous?.signature === current.signature, available = new Set(current.availableKeys);
  const remembered = sameIntent ? [...previous.selectedKeys, ...previous.hiddenKeys] : [];
  const missing = unique(keysWork([...current.intentKeys, ...remembered], spend)).filter(key => !available.has(key));
  const beforeHidden = new Set(sameIntent ? previous.hiddenKeys : []);
  const restored = current.selectedKeys.filter(key => beforeHidden.has(key));
  const hidden = policy === "keep-hidden" ? missing : [];
  const dropped = policy === "drop" ? missing : [];
  const pruned = dropped.length ? unique(sameIntent ? [...previous.selectedKeys, ...previous.hiddenKeys] : current.intentKeys).filter(key => available.has(key)) : null;
  return { hidden, dropped, restored, newlyHidden: hidden.filter(key => !beforeHidden.has(key)), pruned };
}
function event(program, record, delta, policy, spend, missing = false) {
  const convert = keys => missing ? keys.map(key => record.scopedKeys.get(key)) : scopeSelectionKeys(program, record.target, keys, spend);
  return { target: record.target, selection: record.selection, policy, ownerMissing: missing,
    hiddenKeys: convert(delta.newlyHidden), restoredKeys: convert(delta.restored), droppedKeys: convert(delta.dropped) };
}
function scoped(program, record, spend) {
  const keys = unique([...record.selectedKeys, ...record.hiddenKeys]);
  const values = scopeSelectionKeys(program, record.target, keys, spend);
  return new Map(keys.map((key, index) => [key, values[index]]));
}

// Session-local snapshots retain no semantic/graphic clones. Drop is an explicit
// native action on a candidate; keep-hidden never re-creates a removed owner.
export function reconcileSelections(program, previous = [], policy = "keep-hidden", { initialize = false, verify = false, managed = [] } = {}) {
  requireProgram(program); normalizeSelectionPolicy(policy);
  const spend = budget();
  validateGeneratedItemLimit(previous.length, "Selection lifecycle records", MAX_HIT_INDEX_ITEMS); spend(previous.length);
  const old = new Map(previous.map(record => { const key = identity(record); spend(key.length); return [key, record]; }));
  const records = [], changes = [], affectedOwners = [];
  const delegated = new Set(managed.map(identity));
  for (const owner of definitions(program, spend)) {
    let current = capture(program, owner, spend, policy);
    const id = identity(owner), before = old.get(id); old.delete(id);
    const delta = compare(current, before, initialize ? "keep-hidden" : policy, spend);
    if (!initialize && delta.pruned !== null) {
      if (verify) throw new Error("Linked selection effects created an unplanned orphan; cyclic reconciliation is unsupported.");
      if (!delegated.has(id)) {
      const prepared = prepareInteractionEdit(program, { type: "select", target: owner.target, payload: { id: owner.selection,
        select: { items: scopeSelectionKeys(program, owner.target, delta.pruned, spend), empty: "none", grain: current.grain } } });
      program = prepared.program;
      }
      affectedOwners.push(owner.target);
      current = capture(program, owner, spend, policy);
    }
    current.hiddenKeys = delta.hidden; current.scopedKeys = scoped(program, current, spend);
    records.push(current);
    if (!initialize && (delta.newlyHidden.length || delta.restored.length || delta.dropped.length || before?.missing)) {
      changes.push(event(program, current, delta, policy, spend));
    }
  }
  for (const before of old.values()) {
    const lost = unique(keysWork([...before.selectedKeys, ...before.hiddenKeys], spend)), oldHidden = new Set(before.hiddenKeys);
    if (policy === "keep-hidden") {
      validateGeneratedItemLimit(records.length + 1, "Selection lifecycle records", MAX_HIT_INDEX_ITEMS);
      records.push({ ...before, missing: true, selectedKeys: [], availableKeys: [], hiddenKeys: lost });
      if (!before.missing) changes.push(event(program, before, { newlyHidden: lost.filter(key => !oldHidden.has(key)), restored: [], dropped: [] }, policy, spend, true));
    } else if (lost.length || !before.missing) changes.push(event(program, before, { newlyHidden: [], restored: [], dropped: lost }, policy, spend, true));
  }
  // Another selection's concrete effects must not invalidate an earlier plan.
  if (!initialize && policy === "drop") for (const record of records) {
    if (record.missing) continue;
    const current = capture(program, record, spend, policy), available = new Set(current.availableKeys), selected = new Set(current.selectedKeys);
    if (record.selectedKeys.length !== current.selectedKeys.length || record.selectedKeys.some(key => !available.has(key) || !selected.has(key))) throw new Error("Selection pruning changed an earlier owner; cyclic materialization is unsupported.");
  }
  return { program, records, changes: cloneAndFreeze(changes), affectedOwners: cloneAndFreeze(affectedOwners) };
}
