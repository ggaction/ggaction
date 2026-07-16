import { resolveHistogramBins } from "../../grammar/histogram.js";
import {
  isTransformedScaleType,
  readQuantitativeField,
  transformedTicks
} from "../../grammar/scales.js";
import { niceTicks, timeTicks } from "../../grammar/ticks.js";
import { findDataset } from "../../selectors/datasets.js";
import { findSemanticScale } from "../../selectors/scales.js";

export const DEFAULT_TICK_COUNT = 5;

export function inferHistogramBoundaries(program, channel, scaleId) {
  if (channel !== "x") return undefined;

  const consumers = program.semanticSpec.layers.filter(
    layer =>
      layer.encoding?.x?.scale === scaleId &&
      layer.encoding.x.bin !== undefined
  );
  if (consumers.length === 0) return undefined;
  if (consumers.length > 1) {
    throw new Error(
      `Guide values cannot infer shared histogram bins for scale "${scaleId}".`
    );
  }

  const [layer] = consumers;
  const encoding = layer.encoding.x;
  const dataset = findDataset(program, layer.data);
  const scale = findSemanticScale(program, scaleId);
  if (dataset === undefined || scale === undefined) {
    throw new Error(
      `Guide values require histogram data and scale "${scaleId}".`
    );
  }

  return resolveHistogramBins({
    values: readQuantitativeField(dataset.values, encoding.field),
    bin: encoding.bin,
    domain: scale.domain,
    nice: scale.nice ?? true,
    zero: scale.zero ?? false
  }).boundaries;
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
  const axis = program.guideConfigs.axis?.[channel]?.ticks;
  if (axis?.scale === scaleId) {
    return axis.mode === "values"
      ? { mode: "values", values: axis.values }
      : { mode: "count", count: axis.count };
  }

  const boundaries = inferHistogramBoundaries(program, channel, scaleId);
  return boundaries === undefined
    ? { mode: "count", count: DEFAULT_TICK_COUNT }
    : { mode: "values", values: boundaries };
}
