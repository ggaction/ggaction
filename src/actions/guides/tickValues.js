import { cartesianAxisOwners } from "../../selectors/axes.js";
import { resolveHistogramBins } from "../../grammar/histogram.js";
import { readQuantitativeField } from "../../grammar/scales/index.js";
import { axisTickSelection } from "../../grammar/ticks.js";
import { findDataset } from "../../selectors/datasets.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { applyItemMissingPolicy } from "../../grammar/itemMissing.js";

export const DEFAULT_TICK_COUNT = 5;

export function inferHistogramBoundaries(program, channel, scaleId) {
  if (channel !== "x") return undefined;

  const consumers = program.semanticSpec.layers.filter(
    layer =>
      layer.encoding?.x?.scale === scaleId &&
      layer.encoding.x.bin !== undefined
  );
  if (consumers.length === 0) return undefined;
  const scale = findSemanticScale(program, scaleId);
  const boundaries = consumers.map(layer => {
    const encoding = layer.encoding.x;
    const dataset = findDataset(program, layer.data);
    if (dataset === undefined || scale === undefined) {
      throw new Error(`Guide values require histogram data and scale "${scaleId}".`);
    }
    return resolveHistogramBins({
      values: readQuantitativeField(applyItemMissingPolicy(layer, dataset).values, encoding.field),
      bin: encoding.bin,
      domain: scale.domain,
      nice: scale.nice ?? true,
      zero: scale.zero ?? false
    }).boundaries;
  });
  const [unique] = boundaries;
  if (boundaries.some(values => values.length !== unique.length ||
    values.some((value, index) => value !== unique[index]))) {
    throw new Error(`Guide values cannot infer shared histogram bins for scale "${scaleId}".`);
  }
  const domain = program.resolvedScales[scaleId]?.domain;
  // Retained histogram bins can extend beyond an auto domain after filtering.
  // Inferred guides follow the displayed interval; user-specified tick values
  // still use the normal strict validation path.
  if (domain === undefined) return unique;
  const minimum = Math.min(...domain), maximum = Math.max(...domain);
  return unique.filter(value => value >= minimum && value <= maximum);
}

export function inferGridTickConfig(program, channel, scaleId) {
  const axes = cartesianAxisOwners(program).filter(owner => owner.channel === channel &&
    owner.config?.ticks?.scale === scaleId).map(owner => owner.config.ticks);
  const policies = axes.map(axisTickSelection);
  if (new Set(policies.map(policy => JSON.stringify(policy))).size > 1) {
    throw new Error("Grid values require explicit count or values when bound axis tick policies differ.");
  }
  if (policies.length > 0) return policies[0];

  const boundaries = inferHistogramBoundaries(program, channel, scaleId);
  const scale = program.resolvedScales[scaleId];
  if (
    boundaries === undefined &&
    ["ordinal", "band", "point"].includes(scale?.type)
  ) {
    return { mode: "values", values: scale.domain };
  }
  return boundaries === undefined
    ? { mode: "count", count: DEFAULT_TICK_COUNT }
    : { mode: "values", values: boundaries };
}
