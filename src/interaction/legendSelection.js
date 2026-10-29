import { cloneAndFreeze } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { legendBlockDescriptors, resolveLegendBlock } from "../materialization/legendTargets.js";
import { LEGEND_CHANNELS } from "../core/vocabulary.js";
import { interactionOptions as options } from "./input.js";
import { normalizeClickSelection, resolveClickSelection } from "./clickSelection.js";
import { scopeSelectionKeys } from "./selection.js";
import { hitLegendCategory } from "./legendCategory.js";

export function resolveLegendSelection(program, binding, allowMissing = false) {
  const owner = resolveClickSelection(program, binding.target, binding.selection, allowMissing);
  if (!owner) return null;
  if (allowMissing && !legendBlockDescriptors(owner.view, owner.target.id).some(block => block.channels.includes(binding.channel))) return null;
  const block = resolveLegendBlock(owner.view, { target: owner.target.id, channel: binding.channel }, "Legend selection");
  if (block.family !== "categorical") throw new Error("Legend selection requires a categorical legend block.");
  const { config } = block;
  let work = config.field.length;
  for (const item of owner.resolved.items) {
    validateWorkLimit(++work, "Legend selection work");
    if (!Object.hasOwn(item.fields ?? {}, config.field)) throw new Error("Legend selection requires an unambiguous final-item field.");
  }
  return { ...owner, config, kind: block.kind };
}

export function normalizeLegendSelection(program, value, links) {
  const request = options(value, ["type", "effect", "target", "channel", "selection"], ["mode", "slop"], "Legend selection binding");
  if (request.type !== "legend" || request.effect !== "selection") throw new TypeError("Legend binding requires the selection effect.");
  if (!LEGEND_CHANNELS.includes(request.channel)) throw new TypeError("Legend selection requires an explicit legend channel.");
  const click = normalizeClickSelection(program, { type: "select", target: request.target, selection: request.selection,
    mode: request.mode === undefined ? "toggle" : request.mode, onMiss: "ignore", ...(request.slop === undefined ? {} : { slop: request.slop }) }, links);
  const binding = { ...click, type: "legend", effect: "selection", channel: request.channel };
  resolveLegendSelection(program, binding);
  return cloneAndFreeze(binding);
}

// Match semantic guide keys without parsing display text or opaque item keys.
// Map preserves typed category equality, including the native same-zero policy.
export function legendSelectionCommand(program, binding, hit) {
  const owner = resolveLegendSelection(program, binding, true);
  if (!owner) return null;
  let work = 0;
  const spend = count => validateWorkLimit(work += count, "Legend selection work");
  const { resolved, target, config, kind } = owner, groups = new Map();
  for (const item of resolved.items) {
    spend(1 + item.key.length);
    if (item.visible === false) continue;
    const value = item.fields[config.field], group = groups.get(value) ?? [];
    group.push(item.key); groups.set(value, group);
  }
  const category = hitLegendCategory(program, target, kind, config, hit, spend);
  if (!category) return null;
  const keys = groups.get(category.value) ?? [];
  if (!keys.length) return null;
  const selector = resolved.selector;
  if (binding.mode === "replace" && selector.items?.length === keys.length) {
    const current = new Set(selector.items);
    if (keys.every(key => current.has(key))) return null;
  }
  return { type: "select", target, payload: { id: binding.selection,
    select: { items: scopeSelectionKeys(program, target, keys, spend), empty: "none", grain: resolved.definition.grain }, mode: binding.mode }, origin: "user" };
}
