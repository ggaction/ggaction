import { cloneAndFreeze } from "../../core/immutable.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { interpolateNumber } from "../numeric.js";
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
  return interpolateNumber(sorted[lower], sorted[upper], position - lower);
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
  if (Array.isArray(range)) {
    validateGeneratedItemLimit(
      range.length,
      "Discretized color range length"
    );
  }
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
  const colorCount = type === "threshold"
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
      (_, index) => interpolateNumber(
        resolvedDomain[0],
        resolvedDomain[1],
        (index + 1) / colors.length
      )
    );
    if (thresholds.some((value, index) =>
      value <= (index === 0 ? resolvedDomain[0] : thresholds[index - 1]) ||
      value >= resolvedDomain[1]
    )) {
      throw new RangeError(
        "Quantize color range requests more classes than its numeric domain can represent."
      );
    }
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

export function formatDiscretizedIntervals(thresholds) {
  nondecreasing(thresholds, "Discretized color thresholds");
  let resolution = Infinity;
  for (let index = 1; index < thresholds.length; index += 1) {
    const gap = thresholds[index] - thresholds[index - 1];
    if (Number.isFinite(gap) && gap > 0) resolution = Math.min(resolution, gap);
  }
  let labels = thresholds.map(value =>
    Number.isInteger(value) ? String(value) : value.toFixed(1)
  );
  if (thresholds.some((value, index) => {
    const rounded = Number(labels[index]);
    return value !== 0 && rounded === 0 ||
      index > 0 && value !== thresholds[index - 1] &&
        labels[index] === labels[index - 1] ||
      !Number.isInteger(value) && Math.abs(rounded - value) > resolution / 4;
  })) labels = thresholds.map(String);
  return cloneAndFreeze([
    `< ${labels[0]}`,
    ...labels.slice(0, -1).map((value, index) =>
      `${value}–${labels[index + 1]}`
    ),
    `≥ ${labels.at(-1)}`
  ]);
}
