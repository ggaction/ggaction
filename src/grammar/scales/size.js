import { cloneAndFreeze } from "../../core/immutable.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { interpolateNumber } from "../numeric.js";
import { validateSizeRange, resolveSizeRange } from "./appearance.js";
import { mapLinearValues } from "./continuous.js";
import { mapTransformedValues, resolveTransformedDomain } from "./transformed.js";
import { validateScaleUnknown } from "./policies.js";
import { validatePair } from "./validation.js";

export const CONTINUOUS_SIZE_SCALE_TYPES = cloneAndFreeze([
  "linear", "log", "sqrt", "pow"
]);
export const DISCRETE_SIZE_SCALE_TYPES = cloneAndFreeze([
  "quantize", "quantile", "threshold"
]);
export const SIZE_SCALE_TYPES = cloneAndFreeze([
  ...CONTINUOUS_SIZE_SCALE_TYPES,
  ...DISCRETE_SIZE_SCALE_TYPES
]);

export function isContinuousSizeScaleType(type) {
  return CONTINUOUS_SIZE_SCALE_TYPES.includes(type);
}

export function isDiscreteSizeScaleType(type) {
  return DISCRETE_SIZE_SCALE_TYPES.includes(type);
}

export function isSizeScaleType(type) {
  return SIZE_SCALE_TYPES.includes(type);
}

export function validateSizeScaleType(type) {
  if (!isSizeScaleType(type)) {
    throw new Error(`Scale type "${type}" is not valid for size.`);
  }
  return type;
}

function finiteArray(value, label, minimumLength = 1) {
  if (
    !Array.isArray(value) ||
    value.length < minimumLength ||
    !value.every(Number.isFinite)
  ) {
    throw new TypeError(`${label} must contain finite numbers.`);
  }
  return value;
}

function strictlyIncreasing(value, label) {
  finiteArray(value, label);
  if (value.some((item, index) => index > 0 && item <= value[index - 1])) {
    throw new RangeError(`${label} must be strictly increasing.`);
  }
  return value;
}

function validateContinuousDomain(type, domain) {
  const validated = validatePair(domain, "Size scale domain");
  if (type !== "linear" && validated[0] === validated[1]) {
    throw new RangeError(
      `Size ${type} scale domain values must be distinct.`
    );
  }
  if (type === "log" && validated.some(value => value <= 0)) {
    throw new RangeError("Size log scale domain must be strictly positive.");
  }
  if (["sqrt", "pow"].includes(type) && validated.some(value => value < 0)) {
    throw new RangeError(
      `Size ${type} scale domain must be non-negative.`
    );
  }
  return validated;
}

export function validateSizeScaleDomain(type, domain) {
  validateSizeScaleType(type);
  if (domain === "auto") {
    if (type === "threshold") {
      throw new Error("Threshold size scale requires an explicit domain.");
    }
    return domain;
  }
  if (isContinuousSizeScaleType(type)) {
    return validateContinuousDomain(type, domain);
  }
  if (type === "quantize") {
    const validated = validatePair(domain, "Quantize size domain");
    if (validated[0] >= validated[1]) {
      throw new RangeError(
        "Quantize size domain must be a strictly increasing pair."
      );
    }
    return validated;
  }
  if (type === "quantile") {
    return cloneAndFreeze(finiteArray(domain, "Quantile size domain"));
  }
  return cloneAndFreeze(
    strictlyIncreasing(domain, "Threshold size domain")
  );
}

export function validateDiscreteSizeRange(range) {
  finiteArray(range, "Discrete size range", 2);
  validateGeneratedItemLimit(range.length, "Discrete size range length");
  if (range.some(value => value < 0)) {
    throw new RangeError(
      "Discrete size range must contain non-negative areas."
    );
  }
  if (range.some((value, index) => index > 0 && value < range[index - 1])) {
    throw new RangeError("Discrete size range must be nondecreasing.");
  }
  return cloneAndFreeze(range);
}

export function validateSizeScaleRange(type, range) {
  validateSizeScaleType(type);
  if (isContinuousSizeScaleType(type)) return validateSizeRange(range);
  if (range === "auto") {
    throw new Error(`Size ${type} scale requires an explicit range.`);
  }
  return validateDiscreteSizeRange(range);
}

function sizeTypeFamily(type) {
  return isContinuousSizeScaleType(type) ? "continuous" : type;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${label} must be a boolean.`);
  }
  return value;
}

function positiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
  return value;
}

export function normalizeSizeScaleDefinition({ previous = {}, patch = {} } = {}) {
  const type = validateSizeScaleType(patch.type ?? previous.type ?? "linear");
  const hasPrevious = previous.type !== undefined;
  const typeChanged = hasPrevious && previous.type !== type;
  if (typeChanged && sizeTypeFamily(previous.type) !== sizeTypeFamily(type) &&
    !Object.hasOwn(patch, "domain")) {
    throw new Error(
      "Size scale type-family transition requires an explicit domain."
    );
  }
  if (typeChanged && isDiscreteSizeScaleType(type) &&
    !Object.hasOwn(patch, "range")) {
    throw new Error(
      `Size ${type} scale transition requires an explicit range.`
    );
  }
  if (typeChanged && isDiscreteSizeScaleType(previous.type) &&
    isContinuousSizeScaleType(type) && !Object.hasOwn(patch, "range")) {
    throw new Error(
      "Discrete-to-continuous size scale transition requires an explicit range."
    );
  }
  for (const property of [
    "nice", "zero", "constant", "padding", "paddingInner", "paddingOuter",
    "align", "palette", "interpolate", "midpoint", "radialMapping"
  ]) {
    if (Object.hasOwn(patch, property)) {
      throw new Error(`Size scale does not support ${property}.`);
    }
  }

  const rawDomain = Object.hasOwn(patch, "domain")
    ? patch.domain
    : Object.hasOwn(previous, "domain")
      ? previous.domain
      : "auto";
  const rawRange = Object.hasOwn(patch, "range")
    ? patch.range
    : Object.hasOwn(previous, "range")
      ? previous.range
      : "auto";
  const definition = {
    type,
    domain: validateSizeScaleDomain(type, rawDomain),
    range: validateSizeScaleRange(type, rawRange)
  };

  const reverse = Object.hasOwn(patch, "reverse")
    ? patch.reverse
    : previous.reverse;
  if (reverse !== undefined) {
    definition.reverse = requireBoolean(reverse, "Size scale reverse");
  }

  if (isContinuousSizeScaleType(type)) {
    const clamp = Object.hasOwn(patch, "clamp")
      ? patch.clamp
      : isContinuousSizeScaleType(previous.type)
        ? previous.clamp
        : undefined;
    if (clamp !== undefined) {
      definition.clamp = requireBoolean(clamp, "Size scale clamp");
    }
  } else if (Object.hasOwn(patch, "clamp")) {
    throw new Error(`Size ${type} scale does not support clamp.`);
  }

  if (type === "log") {
    const base = Object.hasOwn(patch, "base")
      ? patch.base
      : !typeChanged && previous.type === "log"
        ? previous.base
        : 10;
    definition.base = positiveFinite(base ?? 10, "Size log scale base");
    if (definition.base === 1) {
      throw new RangeError("Size log scale base must not equal 1.");
    }
  } else if (Object.hasOwn(patch, "base")) {
    throw new Error(`Size ${type} scale does not support base.`);
  }

  if (type === "pow") {
    const exponent = Object.hasOwn(patch, "exponent")
      ? patch.exponent
      : !typeChanged && previous.type === "pow"
        ? previous.exponent
        : undefined;
    if (exponent === undefined) {
      throw new Error("Size pow scale requires an explicit exponent.");
    }
    definition.exponent = positiveFinite(
      exponent,
      "Size pow scale exponent"
    );
  } else if (Object.hasOwn(patch, "exponent")) {
    throw new Error(`Size ${type} scale does not support exponent.`);
  }

  const unknown = Object.hasOwn(patch, "unknown")
    ? patch.unknown
    : previous.unknown;
  if (unknown !== undefined) {
    definition.unknown = validateScaleUnknown("size", unknown);
  }
  return cloneAndFreeze(definition);
}

function validateSizeValues(values, type) {
  if (!Array.isArray(values) || !values.every(Number.isFinite)) {
    throw new TypeError("Size scale values must be finite numbers.");
  }
  if (type === "log" && values.some(value => value <= 0)) {
    throw new RangeError("Size log scale values must be strictly positive.");
  }
  if (["sqrt", "pow"].includes(type) && values.some(value => value < 0)) {
    throw new RangeError(`Size ${type} scale values must be non-negative.`);
  }
  return values;
}

function numericExtent(values) {
  let minimum = values[0];
  let maximum = values[0];
  for (const value of values.slice(1)) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return [minimum, maximum];
}

function resolveContinuousSizeDomain(definition, values) {
  validateSizeValues(values, definition.type);
  if (definition.domain !== "auto") {
    return validateSizeScaleDomain(definition.type, definition.domain);
  }
  if (values.length === 0) {
    throw new Error("Cannot infer an automatic size scale domain from no values.");
  }
  if (definition.type === "linear") {
    return cloneAndFreeze(numericExtent(values));
  }
  if (["sqrt", "pow"].includes(definition.type) && values.every(value => value === 0)) {
    return cloneAndFreeze([0, 1]);
  }
  const domain = resolveTransformedDomain({
    type: definition.type,
    domain: "auto",
    values,
    ...(definition.type === "log" ? { base: definition.base } : {}),
    ...(definition.type === "pow" ? { exponent: definition.exponent } : {})
  });
  return validateSizeScaleDomain(definition.type, domain);
}

function quantile(sorted, probability) {
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return interpolateNumber(
    sorted[lower],
    sorted[upper],
    position - lower
  );
}

export function resolveSizeScale({
  type,
  domain = "auto",
  range = "auto",
  values = [],
  ...options
} = {}) {
  const definition = normalizeSizeScaleDefinition({
    patch: { type, domain, range, ...options }
  });
  validateSizeValues(values, definition.type);
  if (isContinuousSizeScaleType(definition.type)) {
    const resolvedDomain = resolveContinuousSizeDomain(definition, values);
    const resolvedRange = [...resolveSizeRange(definition.range)];
    if (definition.reverse === true) resolvedRange.reverse();
    return cloneAndFreeze({
      type: definition.type,
      domain: resolvedDomain,
      range: resolvedRange,
      ...(definition.clamp === undefined ? {} : { clamp: definition.clamp }),
      ...(definition.type === "log" ? { base: definition.base } : {}),
      ...(definition.type === "pow" ? { exponent: definition.exponent } : {}),
      ...(definition.unknown === undefined ? {} : { unknown: definition.unknown })
    });
  }

  const resolvedRange = [...definition.range];
  if (definition.reverse === true) resolvedRange.reverse();
  const sample = [...values].sort((left, right) => left - right);
  let resolvedDomain;
  let thresholds;
  if (definition.type === "quantize") {
    if (definition.domain === "auto") {
      if (sample.length === 0) {
        throw new Error(
          "Cannot infer an automatic quantize size domain from no values."
        );
      }
      resolvedDomain = numericExtent(sample);
      if (resolvedDomain[0] === resolvedDomain[1]) {
        throw new RangeError(
          "Quantize size scale requires a non-zero domain span."
        );
      }
    } else {
      resolvedDomain = [...definition.domain];
    }
    thresholds = Array.from(
      { length: resolvedRange.length - 1 },
      (_, index) => interpolateNumber(
        resolvedDomain[0],
        resolvedDomain[1],
        (index + 1) / resolvedRange.length
      )
    );
    if (thresholds.some((value, index) =>
      value <= (index === 0 ? resolvedDomain[0] : thresholds[index - 1]) ||
      value >= resolvedDomain[1]
    )) {
      throw new RangeError(
        "Quantize size range requests more buckets than its domain can represent."
      );
    }
  } else if (definition.type === "quantile") {
    const source = definition.domain === "auto"
      ? sample
      : [...definition.domain].sort((left, right) => left - right);
    if (source.length === 0) {
      throw new Error(
        "Cannot infer automatic quantile size thresholds from no values."
      );
    }
    resolvedDomain = source;
    thresholds = Array.from(
      { length: resolvedRange.length - 1 },
      (_, index) => quantile(
        source,
        (index + 1) / resolvedRange.length
      )
    );
  } else {
    resolvedDomain = [...definition.domain];
    thresholds = [...definition.domain];
    if (resolvedRange.length !== thresholds.length + 1) {
      throw new RangeError(
        "Threshold size range must contain exactly one more area than its domain."
      );
    }
  }
  return cloneAndFreeze({
    type: definition.type,
    domain: resolvedDomain,
    thresholds,
    range: resolvedRange,
    ...(definition.unknown === undefined ? {} : { unknown: definition.unknown })
  });
}

export function discretizedSizeIndex(value, thresholds) {
  if (!Number.isFinite(value)) {
    throw new TypeError("Discrete size values must be finite numbers.");
  }
  let index = 0;
  while (index < thresholds.length && value >= thresholds[index]) index += 1;
  return index;
}

function validateMappedAreas(areas) {
  if (areas.some(area => !Number.isFinite(area) || area < 0)) {
    throw new RangeError(
      "Size scale mapping must produce non-negative finite areas."
    );
  }
  return cloneAndFreeze(areas);
}

export function mapSizeValues(values, scale) {
  validateSizeScaleType(scale?.type);
  const hasUnknown = Object.hasOwn(scale, "unknown");
  const finite = values.filter(Number.isFinite);
  validateSizeValues(finite, scale.type);
  if (!hasUnknown && finite.length !== values.length) {
    throw new TypeError("Size scale values must be finite numbers.");
  }
  let mapped;
  if (isDiscreteSizeScaleType(scale.type)) {
    mapped = values.map(value => {
      if (!Number.isFinite(value)) return scale.unknown;
      return scale.range[discretizedSizeIndex(value, scale.thresholds)];
    });
  } else if (scale.type === "linear") {
    mapped = mapLinearValues(values, scale.domain, scale.range, {
      clamp: scale.clamp ?? false,
      ...(hasUnknown ? { unknown: scale.unknown } : {})
    });
  } else {
    mapped = mapTransformedValues(values, scale.domain, scale.range, {
      type: scale.type,
      clamp: scale.clamp ?? false,
      ...(hasUnknown ? { unknown: scale.unknown } : {}),
      ...(scale.type === "log" ? { base: scale.base } : {}),
      ...(scale.type === "pow" ? { exponent: scale.exponent } : {})
    });
  }
  return validateMappedAreas(mapped);
}
