import { cloneAndFreeze } from "../core/immutable.js";
import { COLOR_LAYOUTS } from "../core/vocabulary.js";
import {
  normalizedFiniteSum,
  restoreFiniteScale,
  requireFiniteResult
} from "./numeric.js";

export const DEFAULT_SERIES_BASELINE = 0;

export function validateColorLayout(layout) {
  if (!COLOR_LAYOUTS.includes(layout)) {
    throw new Error(`Unsupported color layout "${layout}".`);
  }
  return layout;
}

function validateValues(values) {
  if (!Array.isArray(values) || !values.every(Number.isFinite)) {
    throw new TypeError("Series layout values must be finite numbers.");
  }
}

function requireResolvedSegment(start, end, value, layout) {
  requireFiniteResult(end, `Series ${layout} end`);
  if (value > 0 ? end <= start : end >= start) {
    throw new RangeError(
      `Series ${layout} value cannot resolve a distinct finite segment.`
    );
  }
}

export function layoutSeriesPartition(
  values,
  layout,
  { baseline = DEFAULT_SERIES_BASELINE } = {}
) {
  validateValues(values);
  validateColorLayout(layout);
  if (!Number.isFinite(baseline)) {
    throw new TypeError("Series layout baseline must be finite.");
  }

  if (layout === "group" || layout === "overlay") {
    return cloneAndFreeze(values.flatMap((value, index) =>
      value === baseline
        ? []
        : [{ index, value, start: baseline, end: value }]
    ));
  }

  if (layout === "stack" || layout === "fill" || layout === "center") {
    if (values.some(value => value < 0)) {
      throw new RangeError(`${layout} layout requires non-negative values.`);
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    if (layout === "fill" && total === 0) return cloneAndFreeze([]);
    const normalized = Number.isFinite(total)
      ? undefined
      : normalizedFiniteSum(values, `Series ${layout} values`);
    if (layout === "stack" && normalized) {
      throw new RangeError("Series stack total is outside the finite numeric range.");
    }
    let offset = 0;
    if (layout === "center") {
      offset = -(normalized
        ? restoreFiniteScale(
          normalized.total / 2,
          normalized.scale,
          "Series center half-total"
        )
        : total / 2);
    }
    let positiveIndex = 0;
    const positiveCount = values.filter(value => value > 0).length;
    return cloneAndFreeze(values.flatMap((value, index) => {
      if (value === 0) return [];
      positiveIndex += 1;
      const resolvedValue = layout === "fill"
        ? normalized
          ? (value / normalized.scale) / normalized.total
          : value / total
        : value;
      const start = offset;
      const end = layout === "fill" && positiveIndex === positiveCount
        ? 1
        : start + resolvedValue;
      requireResolvedSegment(start, end, value, layout);
      offset = end;
      return [{ index, value, start, end }];
    }));
  }

  let positive = 0;
  let negative = 0;
  return cloneAndFreeze(values.flatMap((value, index) => {
    if (value === 0) return [];
    const start = value > 0 ? positive : negative;
    const end = start + value;
    requireResolvedSegment(start, end, value, layout);
    if (value > 0) positive = end;
    else negative = end;
    return [{ index, value, start, end }];
  }));
}

export function resolveSeriesLayoutDomainValues(partitions, layout) {
  if (!Array.isArray(partitions)) {
    throw new TypeError("Series layout partitions must be an array.");
  }
  validateColorLayout(layout);
  for (const partition of partitions) validateValues(partition);

  if (layout === "fill") return [0, 1];
  if (layout === "group" || layout === "overlay") {
    return partitions.flatMap(partition => [
      DEFAULT_SERIES_BASELINE,
      ...partition
    ]);
  }
  return partitions.flatMap(partition => {
    const segments = layoutSeriesPartition(partition, layout);
    return layout === "center" && segments.length === 0
      ? [DEFAULT_SERIES_BASELINE]
      : segments.flatMap(segment => [segment.start, segment.end]);
  });
}
