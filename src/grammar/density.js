import { cloneAndFreeze } from "../core/immutable.js";
import { isNominalValue } from "./scales.js";

const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);

export const DENSITY_KERNELS = Object.freeze([
  "gaussian",
  "epanechnikov",
  "uniform",
  "triangular"
]);
export const DENSITY_NORMALIZATIONS = Object.freeze(["unit", "count"]);

export function validateDensityKernel(value) {
  if (!DENSITY_KERNELS.includes(value)) {
    throw new Error(`Unsupported density kernel "${value}".`);
  }
  return value;
}

export function validateDensityNormalization(value) {
  if (!DENSITY_NORMALIZATIONS.includes(value)) {
    throw new Error(`Unsupported density normalization "${value}".`);
  }
  return value;
}

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function quantile(sortedValues, probability) {
  const index = (sortedValues.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const ratio = index - lower;
  return sortedValues[lower] * (1 - ratio) + sortedValues[upper] * ratio;
}

function sampleDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sumSquares = values.reduce(
    (sum, value) => sum + (value - mean) ** 2,
    0
  );
  return Math.sqrt(sumSquares / (values.length - 1));
}

export function estimateDensityBandwidth(values) {
  if (!Array.isArray(values) || !values.every(Number.isFinite)) {
    throw new TypeError("Density bandwidth values must be finite numbers.");
  }
  if (values.length < 2) {
    throw new Error("Density auto bandwidth requires at least two values.");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const deviation = sampleDeviation(sorted);
  const interquartileRange = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const robustDeviation = interquartileRange / 1.34;
  const spread = robustDeviation > 0
    ? Math.min(deviation, robustDeviation)
    : deviation;
  const bandwidth = 1.06 * spread * sorted.length ** -0.2;
  if (!Number.isFinite(bandwidth) || bandwidth <= 0) {
    throw new Error("Density auto bandwidth requires varying finite values.");
  }
  return bandwidth;
}

function resolveBandwidth(value, sourceValues) {
  if (value === undefined || value === "auto") {
    return estimateDensityBandwidth(sourceValues);
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      "Density bandwidth must be a positive finite number or auto."
    );
  }
  return value;
}

function resolveExtent(value, sourceValues) {
  if (value === undefined || value === "auto") {
    const extent = [Math.min(...sourceValues), Math.max(...sourceValues)];
    if (extent[0] === extent[1]) {
      throw new Error("Density observed extent requires varying finite values.");
    }
    return extent;
  }
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every(Number.isFinite) ||
    value[0] >= value[1]
  ) {
    throw new RangeError(
      "Density extent must be an ascending pair of finite numbers or auto."
    );
  }
  return [...value];
}

function resolveOutputFields(as, field, groupBy) {
  const resolved = as ?? [`${field}_value`, `${field}_density`];
  if (
    !Array.isArray(resolved) ||
    resolved.length !== 2 ||
    !resolved.every(value => typeof value === "string" && value.length > 0) ||
    resolved[0] === resolved[1]
  ) {
    throw new TypeError("Density as must contain two distinct non-empty fields.");
  }
  const collisions = new Set([field, groupBy].filter(Boolean));
  if (resolved.some(value => collisions.has(value))) {
    throw new Error("Density output fields must not collide with source or group fields.");
  }
  return [...resolved];
}

const KERNEL_FUNCTIONS = Object.freeze({
  gaussian(value) {
    return Math.exp(-0.5 * value ** 2) / SQRT_TWO_PI;
  },
  epanechnikov(value) {
    return Math.abs(value) <= 1 ? 0.75 * (1 - value ** 2) : 0;
  },
  uniform(value) {
    return Math.abs(value) <= 1 ? 0.5 : 0;
  },
  triangular(value) {
    return Math.abs(value) <= 1 ? 1 - Math.abs(value) : 0;
  }
});

function estimateAt(sample, values, bandwidth, kernel, normalization) {
  const sum = values.reduce(
    (total, value) => total + KERNEL_FUNCTIONS[kernel](
      (sample - value) / bandwidth
    ),
    0
  );
  const denominator = normalization === "unit"
    ? values.length * bandwidth
    : bandwidth;
  return sum / denominator;
}

export function deriveKernelDensity(values, {
  field,
  groupBy,
  bandwidth = "auto",
  extent = "auto",
  steps = 100,
  kernel = "gaussian",
  normalization = "unit",
  as
} = {}) {
  if (!Array.isArray(values)) {
    throw new TypeError("Density values must be an array.");
  }
  const sourceField = requireField(field, "Density field");
  const groupField = groupBy === undefined
    ? undefined
    : requireField(groupBy, "Density groupBy");
  if (!Number.isInteger(steps) || steps < 2) {
    throw new RangeError("Density steps must be an integer of at least 2.");
  }
  const outputFields = resolveOutputFields(as, sourceField, groupField);
  const resolvedKernel = validateDensityKernel(kernel);
  const resolvedNormalization = validateDensityNormalization(normalization);
  const validRows = values.filter(row =>
    row !== null &&
    typeof row === "object" &&
    Number.isFinite(row[sourceField]) &&
    (groupField === undefined || isNominalValue(row[groupField]))
  );
  if (validRows.length === 0) {
    throw new Error("Density requires at least one valid field/group row.");
  }
  const sourceValues = validRows.map(row => row[sourceField]);
  const resolvedBandwidth = resolveBandwidth(bandwidth, sourceValues);
  const resolvedExtent = resolveExtent(extent, sourceValues);
  const groups = groupField === undefined
    ? [undefined]
    : [...new Set(validRows.map(row => row[groupField]))];
  const sampleStep = (resolvedExtent[1] - resolvedExtent[0]) / (steps - 1);
  const samples = Array.from(
    { length: steps },
    (_, index) => index === steps - 1
      ? resolvedExtent[1]
      : resolvedExtent[0] + sampleStep * index
  );
  const rows = [];
  for (const group of groups) {
    const groupValues = validRows
      .filter(row => groupField === undefined || row[groupField] === group)
      .map(row => row[sourceField]);
    for (const sample of samples) {
      rows.push({
        ...(groupField === undefined ? {} : { [groupField]: group }),
        [outputFields[0]]: sample,
        [outputFields[1]]: estimateAt(
          sample,
          groupValues,
          resolvedBandwidth,
          resolvedKernel,
          resolvedNormalization
        )
      });
    }
  }
  return cloneAndFreeze({
    fields: {
      source: sourceField,
      ...(groupField === undefined ? {} : { group: groupField }),
      value: outputFields[0],
      density: outputFields[1]
    },
    groups,
    bandwidth: resolvedBandwidth,
    kernel: resolvedKernel,
    normalization: resolvedNormalization,
    extent: resolvedExtent,
    steps,
    samples,
    values: rows
  });
}
