import { cloneAndFreeze } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { normalizeHitQuery } from "../grammar/hitShapes.js";
import { interactionOptions as options } from "./input.js";
import { interactionOwner, resolveInteractionSelection, scopeSelectionKeys } from "./selection.js";

export function resolveClickSelection(program, target, selection, allowMissing = false) {
  const owner = interactionOwner(program, target, allowMissing);
  if (!owner) return null;
  if (owner.view.compositionSpec?.type === "facet" || owner.target.facetSource) throw new Error("Click selection cannot infer geometry for a facet source.");
  return resolveInteractionSelection(program, owner.target, selection, allowMissing);
}

export function normalizeClickSelection(program, value, links) {
  const request = options(value, ["type", "target", "selection"], ["mode", "onMiss", "slop", "hitInvisible"], "Click selection binding");
  if (request.type !== "select") throw new TypeError("Click selection binding requires select type.");
  const { target } = resolveClickSelection(program, request.target, request.selection);
  const mode = request.mode === undefined ? "replace" : request.mode, onMiss = request.onMiss === undefined ? "clear" : request.onMiss;
  if (!["replace", "toggle"].includes(mode) || !["clear", "ignore"].includes(onMiss)) throw new TypeError("Click selection requires replace/toggle and clear/ignore policies.");
  if (links.some(link => link.selection === request.selection && link.target.id === target.id &&
      JSON.stringify(link.target.childPath) === JSON.stringify(target.childPath))) throw new Error("A linked target selection is owned by its binding.");
  const query = normalizeHitQuery({ ...(request.slop === undefined ? {} : { slop: request.slop }),
    ...(request.hitInvisible === undefined ? {} : { hitInvisible: request.hitInvisible }) });
  return cloneAndFreeze({ type: "select", target, selection: request.selection, mode, onMiss,
    ...(request.slop === undefined ? {} : { slop: query.slop }), hitInvisible: query.hitInvisible });
}

// Host click selection consumes the same current-frame candidates as inspection.
// Native commands remain the only authoring path and own all dependent updates.
export function clickSelectionCommand(program, binding, hit) {
  const owner = resolveClickSelection(program, binding.target, binding.selection, true);
  if (!owner) return null;
  let work = 0;
  const spend = count => validateWorkLimit(work += count, "Click selection work"), { resolved, target } = owner;
  const itemKeys = new Set(scopeSelectionKeys(program, target, resolved.items.filter(item => item.visible !== false).map(item => item.key), spend));
  const candidate = hit.candidates.find(item => { spend(1 + item.itemKey.length); return item.ownerId === target.id &&
    item.childPath.length === target.childPath.length && item.childPath.every((id, index) => id === target.childPath[index]) && itemKeys.has(item.itemKey); });
  const selector = resolved.selector;
  if (!candidate) {
    if (binding.onMiss === "ignore" || (selector.items?.length === 0 && selector.empty === "none")) return null;
    return { type: "clearSelection", target, payload: { id: binding.selection }, origin: "user" };
  }
  const localKey = scopeSelectionKeys(program, target, [candidate.itemKey], spend, true)[0];
  if (binding.mode === "replace" && selector.items?.length === 1 && selector.items[0] === localKey) return null;
  return { type: "select", target, payload: { id: binding.selection, select: { items: [candidate.itemKey], empty: "none", grain: resolved.definition.grain }, mode: binding.mode }, origin: "user" };
}
