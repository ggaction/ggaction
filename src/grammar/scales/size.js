import { cloneAndFreeze } from "../../core/immutable.js";
import {
  validateGeneratedItemLimit,
  validatePositiveFinite as positiveFinite
} from "../../core/validation.js";
import { interpolateNumber, numericExtent } from "../numeric.js";
import { isNominalValue } from "./fields.js";
import { resolveOrdinalDomain, validateOrdinalDomain } from "./ordinal.js";
import { mapLinearValues } from "./continuous.js";
import { mapTransformedValues, resolveTransformedDomain } from "./transformed.js";
import { validateSizeRange, DEFAULT_SIZE_RANGE, mapOrdinalValues } from "./appearance.js";
import { validateScaleUnknown } from "./policies.js";
import { validatePair, validateFiniteScaleArray as finiteArray } from "./validation.js";
import {
  resolveDiscretizedDomain,
  validateDiscretizedDomain,
  discretizedColorIndex
} from "./discretized.js";

export const CONTINUOUS_SIZE_SCALE_TYPES = cloneAndFreeze([
  "linear", "log", "sqrt", "pow"
]);
export const DISCRETE_SIZE_SCALE_TYPES = cloneAndFreeze([
  "quantize", "quantile", "threshold"
]);
export const SIZE_SCALE_TYPES = cloneAndFreeze([
  ...CONTINUOUS_SIZE_SCALE_TYPES,
  ...DISCRETE_SIZE_SCALE_TYPES, "ordinal"
]);

export function isContinuousSizeScaleType(type) {
  return CONTINUOUS_SIZE_SCALE_TYPES.includes(type);
}

export function isDiscreteSizeScaleType(type) {
  return DISCRETE_SIZE_SCALE_TYPES.includes(type);
}

export function isEnumeratedSizeScaleType(type) {
  return type === "ordinal" || isDiscreteSizeScaleType(type);
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

function validateSizeInputSign(values, type, label) {
  if (type === "log" && values.some(value => value <= 0)) {
    throw new RangeError(`Size log scale ${label} must be strictly positive.`);
  }
  if (["sqrt", "pow"].includes(type) && values.some(value => value < 0)) {
    throw new RangeError(`Size ${type} scale ${label} must be non-negative.`);
  }
  return values;
}

function validateContinuousDomain(type, domain) {
  const validated = validatePair(domain, "Size scale domain");
  if (type !== "linear" && validated[0] === validated[1]) {
    throw new RangeError(
      `Size ${type} scale domain values must be distinct.`
    );
  }
  return validateSizeInputSign(validated, type, "domain");
}

export function validateSizeScaleDomain(type, domain) {
  validateSizeScaleType(type);
  if (type === "ordinal") return validateOrdinalDomain(domain);
  if (isContinuousSizeScaleType(type)) {
    return domain === "auto" ? domain : validateContinuousDomain(type, domain);
  }
  return validateDiscretizedDomain(type, domain, "size");
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
  if (type === "ordinal") {
    if (range === "auto") return range;
    finiteArray(range, "Ordinal size range");
    validateGeneratedItemLimit(range.length, "Ordinal size range length");
    return validateMappedAreas(range);
  }
  if (range === "auto") {
    throw new Error(`Size ${type} scale requires an explicit range.`);
  }
  return validateDiscreteSizeRange(range);
}

function sizeTypeFamily(type) {
  return isContinuousSizeScaleType(type) ? "continuous" : type;
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

  const requested = { domain: "auto", range: "auto", ...previous, ...patch };
  const definition = {
    type,
    domain: validateSizeScaleDomain(type, requested.domain),
    range: validateSizeScaleRange(type, requested.range)
  };

  for (const property of ["reverse", "clamp"]) {
    if (property === "clamp" && !isContinuousSizeScaleType(type)) {
      if (Object.hasOwn(patch, property)) {
        throw new Error(`Size ${type} scale does not support clamp.`);
      }
      continue;
    }
    const value = Object.hasOwn(patch, property)
      ? patch[property]
      : property === "clamp" && !isContinuousSizeScaleType(previous.type)
        ? undefined : previous[property];
    if (value !== undefined) {
      if (typeof value !== "boolean") {
        throw new TypeError(`Size scale ${property} must be a boolean.`);
      }
      definition[property] = value;
    }
  }

  for (const [parameter, owner, fallback] of [["base", "log", 10], ["exponent", "pow"]]) {
    if (type !== owner) {
      if (Object.hasOwn(patch, parameter)) {
        throw new Error(`Size ${type} scale does not support ${parameter}.`);
      }
      continue;
    }
    const value = Object.hasOwn(patch, parameter)
      ? patch[parameter]
      : !typeChanged && previous.type === owner ? previous[parameter] : fallback;
    if (parameter === "exponent" && value === undefined) {
      throw new Error("Size pow scale requires an explicit exponent.");
    }
    definition[parameter] = positiveFinite(
      parameter === "base" ? value ?? fallback : value,
      `Size ${type} scale ${parameter}`
    );
    if (parameter === "base" && definition.base === 1) {
      throw new RangeError("Size log scale base must not equal 1.");
    }
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
  return validateSizeInputSign(values, type, "values");
}

function resolveContinuousSizeDomain(definition, values) {
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
  const ordinal = definition.type === "ordinal";
  const source = ordinal ? values.filter(isNominalValue) : validateSizeValues(values, definition.type);
  if (ordinal && source.length !== values.length && definition.unknown === undefined) {
    throw new TypeError("Ordinal size values must be nominal values.");
  }
  if (ordinal || isContinuousSizeScaleType(definition.type)) {
    const resolvedDomain = ordinal
      ? resolveOrdinalDomain(definition.domain, source)
      : resolveContinuousSizeDomain(definition, values);
    if (ordinal) validateGeneratedItemLimit(resolvedDomain.length, "Ordinal size domain length");
    const endpoints = definition.range === "auto" ? DEFAULT_SIZE_RANGE : definition.range;
    const resolvedRange = ordinal && definition.range === "auto"
      ? resolvedDomain.map((_, index) => interpolateNumber(
          endpoints[0], endpoints[1],
          resolvedDomain.length === 1 ? 0.5 : index / (resolvedDomain.length - 1)
        ))
      : [...endpoints];
    if (definition.reverse === true) resolvedRange.reverse();
    const resolved = cloneAndFreeze({
      type: definition.type,
      domain: resolvedDomain,
      range: resolvedRange,
      ...(definition.clamp === undefined ? {} : { clamp: definition.clamp }),
      ...(definition.type === "log" ? { base: definition.base } : {}),
      ...(definition.type === "pow" ? { exponent: definition.exponent } : {}),
      ...(definition.unknown === undefined ? {} : { unknown: definition.unknown })
    });
    if (ordinal) mapSizeValues(values, resolved);
    return resolved;
  }

  const resolvedRange = [...definition.range];
  if (definition.reverse === true) resolvedRange.reverse();
  const { domain: resolvedDomain, thresholds } = resolveDiscretizedDomain({
    type: definition.type, domain: definition.domain, values,
    count: resolvedRange.length, kind: "size"
  });
  return cloneAndFreeze({
    type: definition.type,
    domain: resolvedDomain,
    thresholds,
    range: resolvedRange,
    ...(definition.unknown === undefined ? {} : { unknown: definition.unknown })
  });
}

export function discretizedSizeIndex(value, thresholds) {
  return discretizedColorIndex(value, thresholds, "Discrete size");
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
  if (scale.type === "ordinal") {
    return validateMappedAreas(mapOrdinalValues(values, scale.domain, scale.range,
      hasUnknown ? { unknown: scale.unknown } : {}));
  }
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
  } else {
    const mapper = scale.type === "linear" ? mapLinearValues : mapTransformedValues;
    mapped = mapper(values, scale.domain, scale.range, {
      type: scale.type,
      clamp: scale.clamp ?? false,
      ...(hasUnknown ? { unknown: scale.unknown } : {}),
      ...(scale.type === "log" ? { base: scale.base } : {}),
      ...(scale.type === "pow" ? { exponent: scale.exponent } : {})
    });
  }
  return validateMappedAreas(mapped);
}
