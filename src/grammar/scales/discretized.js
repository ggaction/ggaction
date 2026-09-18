import { cloneAndFreeze } from "../../core/immutable.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { interpolateNumber, quantileSorted } from "../numeric.js";
import { formatValue, validateValueFormat } from "../valueFormat.js";
import { resolveColorRange, validateColorRange } from "./appearance.js";
import { SCALE_ROLES, validateScaleTypeForRole } from "./types.js";
import {
  validatePair,
  validateFiniteScaleArray as finiteValues,
  validateIncreasingScaleArray as ascending
} from "./validation.js";

export const DISCRETIZED_COLOR_SCALE_TYPES = cloneAndFreeze([
  "quantize",
  "quantile",
  "threshold"
]);

function nondecreasing(values, label) {
  finiteValues(values, label);
  if (values.some((value, index) => index > 0 && value < values[index - 1])) {
    throw new RangeError(`${label} must be nondecreasing.`);
  }
  return values;
}


export function validateDiscretizedColorDomain(type, domain) {
  validateScaleTypeForRole(type, SCALE_ROLES.discretizedColor);
  return validateDiscretizedDomain(type, domain, "color");
}

export function validateDiscretizedDomain(type, domain, kind) {
  if (domain === "auto") {
    if (type === "threshold") {
      throw new Error(`Threshold ${kind} scale requires an explicit domain.`);
    }
    return domain;
  }
  if (kind === "color" && !Array.isArray(domain)) {
    throw new TypeError("Discretized color domain must be an array or auto.");
  }
  if (type === "quantize") {
    if (kind === "size") {
      validatePair(domain, "Quantize size domain");
      if (domain[0] >= domain[1]) {
        throw new RangeError("Quantize size domain must be a strictly increasing pair.");
      }
    } else if (domain.length !== 2 || !domain.every(Number.isFinite) || domain[0] >= domain[1]) {
      throw new RangeError("Quantize color domain must be an increasing pair.");
    }
  } else if (type === "quantile") {
    finiteValues(domain, `Quantile ${kind} domain`);
  } else {
    ascending(domain, `Threshold ${kind} domain`);
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

export function resolveDiscretizedDomain({ type, domain, values, count, kind }) {
  let resolvedDomain = domain === "auto"
    ? [...values].sort((left, right) => left - right)
    : [...domain];
  let thresholds;
  if (type === "quantize") {
    if (domain === "auto") {
      if (resolvedDomain.length === 0) {
        throw new Error("Cannot infer an automatic quantize size domain from no values.");
      }
      resolvedDomain = [resolvedDomain[0], resolvedDomain.at(-1)];
    }
    if (resolvedDomain[0] === resolvedDomain[1]) {
      throw new RangeError(`Quantize ${kind} scale requires a non-zero domain span.`);
    }
    thresholds = Array.from({ length: count - 1 }, (_, index) =>
      interpolateNumber(resolvedDomain[0], resolvedDomain[1], (index + 1) / count));
    if (thresholds.some((value, index) =>
      value <= (index === 0 ? resolvedDomain[0] : thresholds[index - 1]) ||
      value >= resolvedDomain[1]
    )) {
      throw new RangeError(kind === "size"
        ? "Quantize size range requests more buckets than its domain can represent."
        : "Quantize color range requests more classes than its numeric domain can represent.");
    }
  } else if (type === "quantile") {
    if (resolvedDomain.length === 0) {
      throw new Error("Cannot infer automatic quantile size thresholds from no values.");
    }
    resolvedDomain.sort((left, right) => left - right);
    thresholds = Array.from({ length: count - 1 }, (_, index) =>
      quantileSorted(resolvedDomain, (index + 1) / count));
  } else {
    thresholds = [...resolvedDomain];
    if (count !== thresholds.length + 1) {
      throw new RangeError(`Threshold ${kind} range must contain exactly one more ${kind === "size" ? "area" : "color"} than its domain.`);
    }
  }
  return { domain: resolvedDomain, thresholds };
}

export function resolveDiscretizedColorScale({ type, domain, range, values }) {
  validateScaleTypeForRole(type, SCALE_ROLES.discretizedColor);
  finiteValues(values, "Discretized color values");
  const requestedDomain = validateDiscretizedColorDomain(type, domain);
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
  const { domain: resolvedDomain, thresholds } = resolveDiscretizedDomain({
    type, domain: requestedDomain, values, count: colors.length, kind: "color"
  });
  return cloneAndFreeze({
    type,
    domain: resolvedDomain,
    thresholds,
    range: colors
  });
}

export function discretizedColorIndex(value, thresholds, label = "Discretized color") {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} values must be finite numbers.`);
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

export function formatDiscretizedIntervals(thresholds, format = "auto") {
  nondecreasing(thresholds, "Discretized color thresholds");
  const resolvedFormat = validateValueFormat(format, "Legend label format");
  let resolution = Infinity;
  for (let index = 1; index < thresholds.length; index += 1) {
    const gap = thresholds[index] - thresholds[index - 1];
    if (Number.isFinite(gap) && gap > 0) resolution = Math.min(resolution, gap);
  }
  let labels = resolvedFormat === "auto"
    ? thresholds.map(value => Number.isInteger(value) ? String(value) : value.toFixed(1))
    : thresholds.map(value => formatValue(value, {
        format: resolvedFormat,
        valueType: "quantitative",
        label: "Legend label format"
      }));
  if (resolvedFormat === "auto" && thresholds.some((value, index) => {
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
