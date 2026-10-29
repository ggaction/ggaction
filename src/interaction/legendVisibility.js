import { cloneAndFreeze } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { LEGEND_CHANNELS } from "../core/vocabulary.js";
import { normalizeHitQuery } from "../grammar/hitShapes.js";
import { legendBlockDescriptors, resolveLegendBlock } from "../materialization/legendTargets.js";
import { findMarkVisibilityDataset } from "../selectors/datasets.js";
import { findLayer } from "../selectors/layers.js";
import { interactionOptions as options } from "./input.js";
import { interactionOwner } from "./selection.js";
import { hitLegendCategory } from "./legendCategory.js";

export function resolveLegendVisibility(program, binding, allowMissing = false) {
  if (typeof program.setMarkVisibility !== "function" || typeof program.removeMarkVisibility !== "function") throw new Error("Legend visibility requires native visibility editors.");
  const owner = interactionOwner(program, binding.target, allowMissing);
  if (!owner) return null;
  if (owner.view.compositionSpec?.type === "facet" || owner.target.facetSource) throw new Error("Legend visibility cannot infer geometry for a facet source.");
  const layer = findLayer(owner.view, owner.target.id);
  if (allowMissing && (!layer || !legendBlockDescriptors(owner.view, owner.target.id).some(block => block.channels.includes(binding.channel)))) return null;
  const block = resolveLegendBlock(owner.view, { target: owner.target.id, channel: binding.channel }, "Legend visibility");
  if (block.family !== "categorical") throw new Error("Legend visibility requires a categorical legend block.");
  if (layer.data === undefined || owner.view.markConfigs[layer.id]?.itemFilterable === false) throw new Error("Legend visibility requires an independent data-backed final-item filter owner.");
  return { ...owner, config: block.config, kind: block.kind, hidden: findMarkVisibilityDataset(owner.view, layer)?.transform[0].visibility.hidden ?? [] };
}

export function normalizeLegendVisibility(program, value) {
  const request = options(value, ["type", "effect", "target", "channel", "scaleDomain"], ["slop"], "Legend visibility binding");
  if (request.type !== "legend" || request.effect !== "visibility") throw new TypeError("Legend binding requires the visibility effect.");
  if (!LEGEND_CHANNELS.includes(request.channel)) throw new TypeError("Legend visibility requires an explicit legend channel.");
  if (!["visible-data", "all-data"].includes(request.scaleDomain)) throw new TypeError("Legend visibility requires visible-data or all-data.");
  const query = normalizeHitQuery(request.slop === undefined ? {} : { slop: request.slop });
  const { target } = resolveLegendVisibility(program, request);
  return cloneAndFreeze({ ...request, target, hitInvisible: query.hitInvisible });
}

export function legendVisibilityCommand(program, binding, hit) {
  const owner = resolveLegendVisibility(program, binding, true);
  if (!owner) return null;
  let work = 0;
  const category = hitLegendCategory(program, owner.target, owner.kind, owner.config, hit,
    count => validateWorkLimit(work += count, "Legend visibility work"));
  if (!category) return null;
  return { type: "setVisibility", target: owner.target, payload: { channel: binding.channel, values: [category.value],
    visible: owner.hidden.includes(category.value), scaleDomain: binding.scaleDomain }, origin: "user" };
}
