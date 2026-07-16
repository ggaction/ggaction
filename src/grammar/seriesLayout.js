import { cloneAndFreeze } from "../core/immutable.js";
import { COLOR_LAYOUTS } from "../core/vocabulary.js";

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

  if (layout === "stack" || layout === "fill") {
    if (values.some(value => value < 0)) {
      throw new RangeError(`${layout} layout requires non-negative values.`);
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    if (layout === "fill" && total === 0) return cloneAndFreeze([]);
    let offset = 0;
    return cloneAndFreeze(values.flatMap((value, index) => {
      if (value === 0) return [];
      const resolvedValue = layout === "fill" ? value / total : value;
      const start = offset;
      const end = start + resolvedValue;
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
  return partitions.flatMap(partition =>
    layoutSeriesPartition(partition, layout).flatMap(segment => [
      segment.start,
      segment.end
    ])
  );
}
