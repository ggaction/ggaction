import { cloneAndFreeze } from "../../core/immutable.js";
import { resolveColorRange, validateColorRange } from "./appearance.js";
import { SCALE_ROLES, validateScaleTypeForRole } from "./types.js";

export const DISCRETIZED_COLOR_SCALE_TYPES = cloneAndFreeze([
  "quantize",
  "quantile",
  "threshold"
]);

function finiteValues(values, label) {
  if (!Array.isArray(values) || values.length === 0 || !values.every(Number.isFinite)) {
    throw new TypeError(`${label} must contain finite numbers.`);
  }
  return values;
}

function ascending(values, label) {
  finiteValues(values, label);
  if (values.some((value, index) => index > 0 && value <= values[index - 1])) {
    throw new RangeError(`${label} must be strictly increasing.`);
  }
  return values;
}

function nondecreasing(values, label) {
  finiteValues(values, label);
  if (values.some((value, index) => index > 0 && value < values[index - 1])) {
    throw new RangeError(`${label} must be nondecreasing.`);
  }
  return values;
}

function quantile(sorted, probability) {
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function validateDiscretizedColorDomain(type, domain) {
  validateScaleTypeForRole(type, SCALE_ROLES.discretizedColor);
  if (domain === "auto") {
    if (type === "threshold") {
      throw new Error("Threshold color scale requires an explicit domain.");
    }
    return domain;
  }
  if (!Array.isArray(domain)) {
    throw new TypeError("Discretized color domain must be an array or auto.");
  }
  if (type === "quantize") {
    if (domain.length !== 2 || !domain.every(Number.isFinite) || domain[0] >= domain[1]) {
      throw new RangeError("Quantize color domain must be an increasing pair.");
    }
  } else if (type === "quantile") {
    finiteValues(domain, "Quantile color domain");
  } else {
    ascending(domain, "Threshold color domain");
  }
  return cloneAndFreeze(domain);
}

export function validateDiscretizedColorRange(range) {
  const validated = validateColorRange(range);
  if (validated === "auto") return validated;
  if (Array.isArray(validated) && validated.length < 2) {
    throw new RangeError("Discretized color range requires at least two colors.");
  }
  return validated;
}

export function resolveDiscretizedColorScale({ type, domain, range, values }) {
  validateScaleTypeForRole(type, SCALE_ROLES.discretizedColor);
  finiteValues(values, "Discretized color values");
  const requestedDomain = validateDiscretizedColorDomain(type, domain);
  const sample = [...values].sort((left, right) => left - right);
  const validatedRange = validateDiscretizedColorRange(range);
  const colorCount = type === "threshold" && requestedDomain !== "auto"
    ? requestedDomain.length + 1
    : Array.isArray(range) ? range.length : 5;
  const colors = resolveColorRange(
    validatedRange === "auto" ? { palette: "viridis" } : validatedRange,
    colorCount
  );
  if (colors.length < 2) {
    throw new RangeError("Discretized color range requires at least two colors.");
  }
  let resolvedDomain;
  let thresholds;
  if (type === "quantize") {
    resolvedDomain = requestedDomain === "auto"
      ? [sample[0], sample.at(-1)]
      : [...requestedDomain];
    if (resolvedDomain[0] === resolvedDomain[1]) {
      throw new RangeError("Quantize color scale requires a non-zero domain span.");
    }
    thresholds = Array.from(
      { length: colors.length - 1 },
      (_, index) => resolvedDomain[0] + (index + 1) / colors.length *
        (resolvedDomain[1] - resolvedDomain[0])
    );
  } else if (type === "quantile") {
    const source = requestedDomain === "auto"
      ? sample
      : [...requestedDomain].sort((left, right) => left - right);
    resolvedDomain = source;
    thresholds = Array.from(
      { length: colors.length - 1 },
      (_, index) => quantile(source, (index + 1) / colors.length)
    );
  } else {
    resolvedDomain = [...requestedDomain];
    thresholds = [...requestedDomain];
    if (colors.length !== thresholds.length + 1) {
      throw new RangeError(
        "Threshold color range must contain exactly one more color than its domain."
      );
    }
  }
  return cloneAndFreeze({
    type,
    domain: resolvedDomain,
    thresholds,
    range: colors
  });
}

export function discretizedColorIndex(value, thresholds) {
  if (!Number.isFinite(value)) {
    throw new TypeError("Discretized color values must be finite numbers.");
  }
  let index = 0;
  while (index < thresholds.length && value >= thresholds[index]) index += 1;
  return index;
}

export function mapDiscretizedColors(values, scale) {
  const hasUnknown = Object.hasOwn(scale, "unknown");
  return cloneAndFreeze(values.map(value => {
    if (!Number.isFinite(value) && hasUnknown) return scale.unknown;
    return scale.range[discretizedColorIndex(value, scale.thresholds)];
  }));
}

function formatBoundary(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatDiscretizedIntervals(thresholds) {
  nondecreasing(thresholds, "Discretized color thresholds");
  return cloneAndFreeze([
    `< ${formatBoundary(thresholds[0])}`,
    ...thresholds.slice(0, -1).map((value, index) =>
      `${formatBoundary(value)}–${formatBoundary(thresholds[index + 1])}`
    ),
    `≥ ${formatBoundary(thresholds.at(-1))}`
  ]);
}
