import { cartesianAxisOwners } from "../../selectors/axes.js";
import { resolveHistogramBins } from "../../grammar/histogram.js";
import {
  isTransformedScaleType,
  readQuantitativeField,
  transformedTicks
} from "../../grammar/scales/index.js";
import { niceTicks, timeTicks } from "../../grammar/ticks.js";
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
  return unique;
}

export function valuesFromTickConfig(program, config) {
  if (config.mode === "values") return config.values;

  const scale = program.resolvedScales[config.scale];
  if (scale?.type === "time") return timeTicks(scale.domain, config.count);
  if (scale?.type === "linear") return niceTicks(scale.domain, config.count);
  if (isTransformedScaleType(scale?.type)) {
    return transformedTicks(scale.type, scale.domain, config.count, {
      ...(scale.base === undefined ? {} : { base: scale.base }),
      ...(scale.exponent === undefined ? {} : { exponent: scale.exponent }),
      ...(scale.constant === undefined ? {} : { constant: scale.constant })
    });
  }
  throw new Error(
    `Guide values require resolved continuous scale "${config.scale}".`
  );
}

export function inferGridTickConfig(program, channel, scaleId) {
  const axes = cartesianAxisOwners(program).filter(owner => owner.channel === channel &&
    owner.config?.ticks?.scale === scaleId).map(owner => owner.config.ticks);
  const policies = axes.map(axis => axis.mode === "values"
    ? { mode: "values", values: axis.values } : { mode: "count", count: axis.count });
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
