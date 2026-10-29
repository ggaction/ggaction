import { retainedHistogramBoundaries, restoreHistogramBin, preserveHistogramBin } from "./filterGeometry.js";
import { resolveMarkVisibilitySelection } from "../../materialization/selection/filter.js";
import { closedAction } from "../../core/action.js";
import { normalizeMarkVisibility, updateVisibilityCategories } from "../../grammar/markVisibility.js";
import { readNominalField } from "../../grammar/scales/fields.js";
import { resolveLegendBlock } from "../../materialization/legendTargets.js";
import { validateVisibilityBinding } from "../../materialization/markVisibility.js";
import { assertIndependentOverlayGeometry } from "../../grammar/overlay.js";
import { applyLayerDataRematerialization } from "../../materialization/dependencies.js";
import { findMarkVisibilityDataset, unfilteredMarkDataset, hasDataset } from "../../selectors/datasets.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";

export function preserveMarkVisibility(program, target, operation) {
  const layer = requireLayer(program, target), dataset = findMarkVisibilityDataset(program, layer);
  if (!dataset) return operation(program);
  const visibility = dataset.transform[0].visibility;
  const base = program.removeMarkVisibility({ target });
  return installMarkVisibility(operation(base), target, visibility);
}

function installMarkVisibility(program, target, visibility) {
  const layer = requireLayer(program, target);
  validateVisibilityBinding(layer, visibility);
  const base = `${target}VisibleData`;
  let id = base, index = 2;
  while (hasDataset(program, id)) id = `${base}${index++}`;
  const { items } = resolveMarkVisibilitySelection(program, target, visibility);
  const boundaries = retainedHistogramBoundaries(layer, items);
  const originalBin = layer.mark?.type === "bar" ? layer.encoding?.x?.bin : undefined;
  const next = preserveHistogramBin(program.createDerivedData({ id, source: layer.data,
    transform: [{ type: "markFilter", target, visibility }] }), layer, boundaries);
  return next._withMarkConfig(target, { ...next.markConfigs[target], visibilityFilter: {
    dataset: id, source: layer.data, empty: false, ...(originalBin === undefined ? {} : { originalBin })
  } }).materializeMarkFilteredData({ id });
}

export const removeMarkVisibility = /* @__PURE__ */ closedAction(
  { op: "removeMarkVisibility", description: "Remove category visibility while preserving the user's filter." }, ["target"],
  function (args = {}) {
    const layer = resolveEligibleLayer(this, { target: args.target, label: "mark visibility",
      predicate: candidate => findMarkVisibilityDataset(this, candidate) !== undefined });
    const dataset = findMarkVisibilityDataset(this, layer);
    const { visibilityFilter: ignored, ...remaining } = this.markConfigs[layer.id] ?? {};
    void ignored;
    let next = this.editSemantic({ property: `layer[${layer.id}].data`, value: dataset.source })
      ._withMarkConfig(layer.id, remaining).releaseDerivedData({ id: dataset.id })._withContext({ currentData: dataset.source });
    if (ignored?.originalBin !== undefined) next = restoreHistogramBin(next, requireLayer(next, layer.id), ignored.originalBin);
    return applyLayerDataRematerialization(next, layer.id);
  }
);

export const setMarkVisibility = /* @__PURE__ */ closedAction(
  { op: "setMarkVisibility", description: "Hide or restore typed categories with an explicit scale-domain policy." },
  ["target", "channel", "values", "visible", "scaleDomain"],
  function (args = {}) {
    const block = resolveLegendBlock(this, args, "setMarkVisibility");
    if (block.family !== "categorical") throw new Error("Mark visibility requires a categorical legend block.");
    const target = block.config.target, layer = requireLayer(this, target);
    assertIndependentOverlayGeometry(layer, "setMarkVisibility");
    if (layer.data === undefined || this.markConfigs[target]?.itemFilterable === false) throw new Error("Mark visibility requires an independent data-backed final-item filter owner.");
    const previous = findMarkVisibilityDataset(this, layer)?.transform[0].visibility;
    if (previous && (previous.field !== block.config.field || JSON.stringify(previous.channels) !== JSON.stringify(block.channels))) {
      throw new Error("Remove mark visibility before changing its controlling legend block.");
    }
    const base = previous ? this.removeMarkVisibility({ target }) : this;
    const baseLayer = requireLayer(base, target), original = unfilteredMarkDataset(base, baseLayer);
    const domain = [...new Set([...block.config.domain, ...readNominalField(original.values, block.config.field), ...(previous?.hidden ?? [])])];
    const hidden = updateVisibilityCategories(domain, previous?.hidden ?? [], args.values, args.visible);
    // Validate the declared policy even when restoring the final hidden category.
    const visibility = normalizeMarkVisibility({ channels: block.channels, field: block.config.field,
      hidden: hidden.length ? hidden : args.values, scaleDomain: args.scaleDomain });
    if (hidden.length === 0) return previous ? base : this;
    if (previous && JSON.stringify({ ...visibility, hidden }) === JSON.stringify(previous)) return this;
    return installMarkVisibility(base, target, { ...visibility, hidden });
  }
);
