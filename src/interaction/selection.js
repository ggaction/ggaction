import { resolveRegisteredSelection } from "../materialization/selection/expression.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { namespaceItemKey, unnamespaceItemKey } from "../grammar/schemas/graphicIdentity.js";
import { validateUserId } from "../core/identifiers.js";
import { normalizeActionTargets } from "../grammar/actionTargets.js";
import { normalizeSelectionSelector } from "../grammar/selectionExpression.js";
import { normalizeMarkSelector } from "../grammar/markSelection.js";
import { SELECTION_SET_MODES } from "../grammar/selectionSet.js";
import { normalizeParameterEditOptions } from "../grammar/parameter.js";
import { requireStoredResource } from "../selectors/resources.js";
import { findLayer } from "../selectors/layers.js";
import { interactionOptions as options, interactionTransactionMetadata } from "./input.js";

export const INTERACTION_EDIT_TYPES = Object.freeze(["select", "clearSelection", "setParameter", "filter", "reorder", "setVisibility", "focusHierarchy", "setViewport", "moveNode", "annotate"]);

export function interactionTransaction(command, generatedId) {
  const request = options(command, ["type", "target", "payload"],
    ["transactionId", "origin", "causeTransactionId"], "Editing command");
  if (!INTERACTION_EDIT_TYPES.includes(request.type)) throw new TypeError("Unsupported editing command type.");
  return cloneAndFreeze({ ...request, ...interactionTransactionMetadata(request, generatedId) });
}

export function interactionOwner(program, requested, allowMissing = false) {
  if (Array.isArray(requested)) throw new TypeError("Editing commands require one explicit owner target.");
  if (typeof requested !== "string") options(requested, ["childPath", "id"], ["facetSource"], "Editing target");
  const [target] = normalizeActionTargets(requested);
  if (target.id === undefined || target.childPath.length > 1024) throw new TypeError("Editing commands require a bounded owner target with an id.");
  let view = program;
  for (const id of target.childPath) {
    if (view.compositionSpec?.type === "facet") throw new Error("Facet cells follow their source; select the facet source explicitly.");
    if (!Object.hasOwn(view.children, id)) {
      if (allowMissing) return null;
      throw new Error(`Unknown target child "${id}".`);
    }
    view = view.children[id];
  }
  if (target.facetSource && view.compositionSpec?.type !== "facet") throw new Error("facetSource requires a facet view.");
  return { target, view };
}

export function resolveInteractionSelection(program, requested, selection, allowMissing = false) {
  const id = validateUserId(selection, "Selection id"), owner = interactionOwner(program, requested, allowMissing);
  if (!owner || (allowMissing && !Object.hasOwn(owner.view.materializationConfigs.selections ?? {}, id))) return null;
  const { view, target } = owner;
  const resolved = resolveRegisteredSelection(view, id, { sourceOnly: target.facetSource === true });
  if (resolved.definition.target !== target.id || resolved.definition.sourceSelection) throw new Error("Selection requires an authored selection matching its explicit owner.");
  return { ...owner, resolved };
}

function address(target, includeId) {
  if (!target.childPath.length && !target.facetSource) return includeId ? { target: target.id } : {};
  return { target: { childPath: target.childPath, ...(target.facetSource ? { facetSource: true } : {}), ...(includeId ? { id: target.id } : {}) } };
}

function requireMethod(program, method) {
  if (typeof program[method] !== "function") throw new Error(`This program does not support ${method}.`);
}
function invoke(program, method, args) {
  requireMethod(program, method);
  return program[method](args);
}

// Reuse the receiver's wrapped domain action. The controller never writes
// semantic or graphic state and never imports the Full authoring assembly.
export function prepareInteractionEdit(program, command) {
  const { target, view } = interactionOwner(program, command.target);
  const affectedOwners = cloneAndFreeze([target]);
  if (command.type === "annotate") {
    // The wrapped native editor owns the closed payload and complete preflight.
    // The host may not redirect its explicit command target through the payload.
    if (Object.hasOwn(command.payload ?? {}, "target")) throw new TypeError("Annotation payload cannot contain target.");
    const layer = findLayer(view, target.id);
    const method = layer?.mark.type === "geo" && layer.geoBinding.mode === "annotation" ? "editGeoAnnotation" : "editAnnotation";
    return { program: invoke(program, method, { ...command.payload, ...address(target, true) }), affectedOwners };
  }
  if (command.type === "filter" || command.type === "reorder") {
    const filter = command.type === "filter";
    const payload = options(command.payload, [], filter ? ["clear", "select", "mode", "recompute"] : ["clear", "channel", "values", "by", "direction"], "Direct command payload");
    let method, args;
    if (Object.hasOwn(payload, "clear")) {
      options(payload, filter ? ["clear"] : ["clear", "channel"], [], "Clear command payload");
      if (payload.clear !== true) throw new TypeError("Clear requires true.");
      method = filter ? "removeMarkFilter" : "removeCategoryOrder";
      args = filter ? {} : { channel: payload.channel };
    } else if (filter) {
      options(payload, ["select"], ["mode", "recompute"], "Filter command payload");
      method = "filterMarks";
      args = { ...normalizeMarkSelector(payload.select),
        ...(Object.hasOwn(payload, "mode") ? { mode: payload.mode } : {}),
        ...(Object.hasOwn(payload, "recompute") ? { recompute: payload.recompute } : {}) };
    } else {
      options(payload, ["channel"], ["values", "by", "direction"], "Reorder command payload");
      method = "orderCategories"; args = payload;
    }
    return { program: invoke(program, method, { ...args, ...address(target, true) }), affectedOwners };
  }
  if (command.type === "focusHierarchy") {
    const payload = options(command.payload, ["focus"], [], "Hierarchy focus payload");
    return { program: invoke(program, "editPartitionPlot", { ...payload, ...address(target, true) }), affectedOwners };
  }
  if (command.type === "moveNode") {
    const payload = options(command.payload, ["key", "x", "y"], [], "Node movement payload");
    return { program: invoke(program, "editLayout", { node: payload, ...address(target, true) }), affectedOwners };
  }
  if (command.type === "setViewport") {
    const payload = options(command.payload, [], ["scalePx", "translatePx", "centerDeg", "rotateDeg"], "Projection viewport payload");
    return { program: invoke(program, "editProjection", { ...payload, ...address(target, true) }), affectedOwners };
  }
  if (command.type === "setVisibility") {
    const payload = options(command.payload, [], ["clear", "channel", "values", "visible", "scaleDomain"], "Visibility command payload");
    let method, args;
    if (Object.hasOwn(payload, "clear")) {
      options(payload, ["clear"], [], "Clear visibility payload");
      if (payload.clear !== true) throw new TypeError("Clear requires true.");
      method = "removeMarkVisibility"; args = {};
    } else {
      options(payload, ["channel", "values", "visible", "scaleDomain"], [], "Visibility command payload");
      method = "setMarkVisibility"; args = payload;
    }
    const next = invoke(program, method, { ...args, ...address(target, true) });
    // Wrapped native no-ops may append trace only. Sessions publish meaningful changes.
    const nextOwner = interactionOwner(next, target).view;
    return { program: nextOwner.semanticSpec === view.semanticSpec && nextOwner.graphicSpec === view.graphicSpec ? program : next, affectedOwners };
  }
  if (command.type === "setParameter") {
    requireMethod(program, "editParameter");
    const payload = options(command.payload, ["value"], [], "Parameter command payload");
    const edit = normalizeParameterEditOptions({ target: target.id, value: payload.value });
    const resource = requireStoredResource(view, { kind: "parameter", id: target.id });
    if (Object.is(resource.result.value, edit.value)) return { program, affectedOwners };
    return { program: invoke(program, "editParameter", { ...address(target, true), value: edit.value }), affectedOwners };
  }
  const payload = options(command.payload, ["id", ...(command.type === "select" ? ["select"] : [])],
    command.type === "select" ? ["mode"] : [], "Selection command payload");
  const id = validateUserId(payload.id, "Selection id"), definition = view.materializationConfigs.selections?.[id];
  if (definition !== undefined && definition.target !== target.id) throw new Error("Selection command target must match its stored owner.");
  const select = command.type === "clearSelection" ? { items: [], empty: "none", grain: definition?.grain ?? "item" }
    : normalizeSelectionSelector(payload.select);
  const mode = payload.mode === undefined ? "replace" : payload.mode;
  if (!SELECTION_SET_MODES.includes(mode)) throw new TypeError("Unknown selection update mode.");
  if (definition === undefined) {
    if (command.type === "clearSelection") throw new Error(`Unknown selection "${id}".`);
    if (mode !== "replace") throw new Error("Creating a selection requires replace mode; other modes edit an existing selection.");
    return { program: invoke(program, "selectMarks", { ...address(target, true), id, ...select }), affectedOwners };
  }
  return { program: invoke(program, "editMarkSelection", { ...address(target, false), selection: id, ...select, mode }), affectedOwners };
}

export function interactionNamespaces(program, target) {
  const namespaces = [];
  for (const child of target.childPath) {
    namespaces.push(`${program.compositionSpec.id}-${child}`); program = program.children[child];
  }
  return namespaces;
}

export function scopeSelectionKeys(program, target, keys, spend, reverse = false) {
  const namespaces = interactionNamespaces(program, target);
  const prefixWork = JSON.stringify(namespaces).length;
  spend(keys.length * prefixWork * Math.max(1, namespaces.length));
  return keys.map(key => {
    spend(key.length * Math.max(1, namespaces.length));
    return reverse ? unnamespaceItemKey(key, namespaces) : namespaces.reduceRight((local, namespace) => namespaceItemKey(local, namespace), key);
  });
}
