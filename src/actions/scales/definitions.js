import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import {
  validateColorRange,
  validateContinuousColorInterpolation,
  validateLinearScaleType,
  validateOpacityRange,
  validateOrdinalDomain,
  validateOrdinalScaleType,
  validateScaleDomain,
  validateScaleRange,
  validateShapeRange,
  validateSizeRange,
  validateStrokeDashRange,
  validateSequentialColorRange,
  validateDiscretizedColorDomain,
  validateDiscretizedColorRange,
  validateTimeScaleType,
  normalizeScaleDefinition,
  SCALE_ROLES,
  validateScalePropertyForType,
  validateScaleTypeForRole,
  isDiscretePositionScaleType
} from "../../grammar/scales/index.js";
import {
  validateRadialRange,
  validateThetaRange
} from "../../grammar/polar.js";
import { withScaleUnknown } from "../../grammar/scales/index.js";
import { findSemanticScale } from "../../selectors/scales.js";

const BASE_OPTIONS = Object.freeze(["id", "type", "domain", "range"]);
const POSITION_OPTIONS = Object.freeze([
  ...BASE_OPTIONS,
  "nice",
  "zero",
  "clamp",
  "reverse",
  "base",
  "exponent",
  "constant",
  "paddingInner",
  "paddingOuter",
  "padding",
  "align",
  "unknown"
]);
const COLOR_OPTIONS = Object.freeze([...BASE_OPTIONS, "palette", "unknown"]);
const SEQUENTIAL_COLOR_OPTIONS = Object.freeze([
  ...COLOR_OPTIONS,
  "interpolate",
  "clamp",
  "reverse"
]);
const OPACITY_OPTIONS = Object.freeze([
  ...POSITION_OPTIONS,
  "clamp",
  "reverse"
]);

function optionsObject(options) {
  if (!isPlainObject(options)) {
    throw new TypeError("Encoding scale must be a plain object.");
  }
  return options;
}

export function resolvePositionScaleDefinition(
  program,
  channel,
  fieldType,
  options,
  defaults = {}
) {
  optionsObject(options);
  validateKeys(options, POSITION_OPTIONS, "scale");
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = findSemanticScale(program, id);
  const expectedType = fieldType === "temporal"
    ? "time"
    : ["ordinal", "nominal"].includes(fieldType)
      ? defaults.discreteType ?? "point"
      : "linear";
  const type = options.type ?? existing?.type ?? expectedType;
  if (fieldType === "temporal") validateTimeScaleType(type);
  else if (["ordinal", "nominal"].includes(fieldType)) {
    if (!isDiscretePositionScaleType(type)) {
      throw new Error(
        `Scale type "${type}" is not valid for discrete position.`
      );
    }
  }
  else if (channel === "theta") validateLinearScaleType(type);
  else validateScaleTypeForRole(type, SCALE_ROLES.quantitativePosition);
  const scale = {
    id,
    ...normalizeScaleDefinition({
      type,
      previous: existing,
      patch: options,
      defaults: {
        ...(existing === undefined && defaults.nice !== undefined
          ? { nice: defaults.nice }
          : {}),
        ...(existing === undefined && defaults.zero !== undefined
          ? { zero: defaults.zero }
          : {})
      },
      retainCoreOnTypeChange: true,
      retainCompatibleOnTypeChange: true,
      validateDomain: (_scaleType, value) =>
        ["ordinal", "nominal"].includes(fieldType)
          ? validateOrdinalDomain(value)
          : validateScaleDomain(value),
      validateRange: (_scaleType, value) => channel === "theta"
        ? validateThetaRange(value)
        : channel === "radius"
          ? validateRadialRange(value)
          : validateScaleRange(value)
    })
  };
  return withScaleUnknown(scale, { ...existing, ...options }, channel);
}

export function resolveColorScaleDefinition(program, options) {
  optionsObject(options);
  validateKeys(options, COLOR_OPTIONS, "scale");
  if (options.palette !== undefined && options.range !== undefined) {
    throw new Error("Color scale cannot specify both palette and range.");
  }
  const id = validateUserId(options.id ?? "color", "Scale id");
  const existing = findSemanticScale(program, id);
  const range = options.palette === undefined
    ? options.range
    : { palette: options.palette };
  return withScaleUnknown({
    id,
    type: validateOrdinalScaleType(options.type ?? existing?.type ?? "ordinal"),
    domain: validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateColorRange(range ?? existing?.range ?? "auto")
  }, { ...existing, ...options }, "color");
}

function continuousDomain(value, fieldType) {
  if (value === "auto") return value;
  if (!Array.isArray(value) || value.length !== 2) {
    throw new TypeError("Continuous color domain must contain two values or auto.");
  }
  const normalized = value.map(item => {
    if (fieldType === "quantitative") return item;
    return typeof item === "string" ? Date.parse(item) : item;
  });
  if (!normalized.every(Number.isFinite) || normalized[0] === normalized[1]) {
    throw new TypeError("Continuous color domain requires two distinct valid values.");
  }
  return normalized;
}

export function resolveSequentialColorScaleDefinition(
  program,
  fieldType,
  options
) {
  optionsObject(options);
  validateKeys(options, SEQUENTIAL_COLOR_OPTIONS, "scale");
  if (options.palette !== undefined && options.range !== undefined) {
    throw new Error("Color scale cannot specify both palette and range.");
  }
  const id = validateUserId(options.id ?? "color", "Scale id");
  const existing = findSemanticScale(program, id);
  const type = options.type ?? existing?.type ?? "sequential";
  if (type !== "sequential") {
    throw new Error(`Unsupported continuous color scale type "${type}".`);
  }
  for (const property of ["clamp", "reverse"]) {
    if (options[property] !== undefined && typeof options[property] !== "boolean") {
      throw new TypeError(`Scale ${property} must be a boolean.`);
    }
  }
  const requestedRange = options.palette === undefined
    ? options.range
    : { palette: options.palette };
  const scale = {
    id,
    type,
    domain: continuousDomain(options.domain ?? existing?.domain ?? "auto", fieldType),
    range: validateSequentialColorRange(
      requestedRange ?? existing?.range ?? { palette: "viridis" }
    ),
    interpolate: validateContinuousColorInterpolation(
      options.interpolate ?? existing?.interpolate ?? "rgb"
    )
  };
  const clamp = options.clamp ?? existing?.clamp;
  const reverse = options.reverse ?? existing?.reverse;
  if (clamp !== undefined) scale.clamp = clamp;
  if (reverse !== undefined) scale.reverse = reverse;
  return withScaleUnknown(scale, { ...existing, ...options }, "color");
}

export function resolveQuantitativeColorScaleDefinition(
  program,
  fieldType,
  options
) {
  optionsObject(options);
  const type = options.type ?? findSemanticScale(
    program,
    options.id ?? "color"
  )?.type ?? "sequential";
  if (type === "sequential") {
    return resolveSequentialColorScaleDefinition(program, fieldType, options);
  }
  validateKeys(options, [
    ...COLOR_OPTIONS,
    "clamp",
    "reverse"
  ], "scale");
  if (fieldType !== "quantitative") {
    throw new Error(`Scale type "${type}" requires quantitative color.`);
  }
  validateScaleTypeForRole(type, SCALE_ROLES.discretizedColor);
  if (options.palette !== undefined && options.range !== undefined) {
    throw new Error("Color scale cannot specify both palette and range.");
  }
  for (const property of ["clamp", "reverse"]) {
    if (options[property] !== undefined && typeof options[property] !== "boolean") {
      throw new TypeError(`Scale ${property} must be a boolean.`);
    }
    if (options[property] !== undefined) validateScalePropertyForType(type, property);
  }
  const id = validateUserId(options.id ?? "color", "Scale id");
  const existing = findSemanticScale(program, id);
  const requestedRange = options.palette === undefined
    ? options.range
    : { palette: options.palette };
  const scale = {
    id,
    type,
    domain: validateDiscretizedColorDomain(
      type,
      options.domain ?? (existing?.type === type ? existing.domain : "auto")
    ),
    range: validateDiscretizedColorRange(
      requestedRange ?? (existing?.type === type ? existing.range : { palette: "viridis" })
    )
  };
  const clamp = options.clamp ?? (existing?.type === type ? existing.clamp : undefined);
  const reverse = options.reverse ?? (existing?.type === type ? existing.reverse : undefined);
  if (clamp !== undefined) scale.clamp = clamp;
  if (reverse !== undefined) scale.reverse = reverse;
  return withScaleUnknown(scale, { ...existing, ...options }, "color");
}

export function resolveStrokeDashScaleDefinition(program, options) {
  optionsObject(options);
  validateKeys(options, [...BASE_OPTIONS, "unknown"], "scale");
  const id = validateUserId(options.id ?? "strokeDash", "Scale id");
  const existing = findSemanticScale(program, id);
  return withScaleUnknown({
    id,
    type: validateOrdinalScaleType(options.type ?? existing?.type ?? "ordinal"),
    domain: validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateStrokeDashRange(options.range ?? existing?.range ?? "auto")
  }, { ...existing, ...options }, "strokeDash");
}

export function resolveAppearanceScaleDefinition(program, channel, options) {
  optionsObject(options);
  validateKeys(options, [...BASE_OPTIONS, "unknown"], "scale");
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = findSemanticScale(program, id);
  const shape = channel === "shape";
  return withScaleUnknown({
    id,
    type: shape
      ? validateOrdinalScaleType(options.type ?? existing?.type ?? "ordinal")
      : validateLinearScaleType(options.type ?? existing?.type ?? "linear"),
    domain: shape
      ? validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto")
      : validateScaleDomain(options.domain ?? existing?.domain ?? "auto"),
    range: shape
      ? validateShapeRange(options.range ?? existing?.range ?? "auto")
      : validateSizeRange(options.range ?? existing?.range ?? "auto")
  }, { ...existing, ...options }, channel);
}

export function resolveOpacityScaleDefinition(program, options) {
  optionsObject(options);
  validateKeys(options, OPACITY_OPTIONS, "scale");
  const id = validateUserId(options.id ?? "opacity", "Scale id");
  const existing = findSemanticScale(program, id);
  const type = validateLinearScaleType(options.type ?? existing?.type ?? "linear");
  for (const property of ["nice", "zero", "clamp", "reverse"]) {
    if (options[property] !== undefined && typeof options[property] !== "boolean") {
      throw new TypeError(`Scale ${property} must be a boolean.`);
    }
  }
  const scale = {
    id,
    type,
    domain: validateScaleDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateOpacityRange(options.range ?? existing?.range ?? "auto")
  };
  const nice = options.nice ?? existing?.nice;
  const zero = options.zero ?? existing?.zero;
  const clamp = options.clamp ?? existing?.clamp;
  const reverse = options.reverse ?? existing?.reverse;
  if (nice !== undefined) scale.nice = nice;
  if (zero !== undefined) scale.zero = zero;
  if (clamp !== undefined) scale.clamp = clamp;
  if (reverse !== undefined) scale.reverse = reverse;
  return withScaleUnknown(scale, { ...existing, ...options }, "opacity");
}

export function resolveOffsetScaleDefinition(program, options, channel = "xOffset") {
  optionsObject(options);
  validateKeys(options, [...BASE_OPTIONS, "unknown"], "scale");
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = findSemanticScale(program, id);
  return withScaleUnknown({
    id,
    type: validateOrdinalScaleType(options.type ?? existing?.type ?? "ordinal"),
    domain: validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateScaleRange(options.range ?? existing?.range ?? "auto")
  }, { ...existing, ...options }, channel);
}
