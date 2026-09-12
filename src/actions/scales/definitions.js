import { prepareScaleEdit } from "./editPolicy.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import {
  validateColorRange,
  validateContinuousColorInterpolation,
  validateSequentialMidpoint,
  validateLinearScaleType,
  validateOpacityRange,
  validateOrdinalDomain,
  validateOrdinalScaleType,
  validateScaleDomain,
  validateScaleRange,
  validateShapeRange,
  validateStrokeDashRange,
  validateStrokeWidthRange,
  validateSequentialColorRange,
  validateDiscretizedColorDomain,
  validateDiscretizedColorRange,
  validateTimeScaleType,
  normalizeScaleDefinition,
  SCALE_ROLES,
  validateScalePropertyForType,
  validateScaleTypeForRole,
  isDiscretePositionScaleType,
  normalizeSizeScaleDefinition,
  withScaleUnknown
} from "../../grammar/scales/index.js";
import {
  validateRadialRange,
  validateThetaRange
} from "../../grammar/polar.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { normalizeOffsetScalePolicy } from "../../grammar/bars/geometry.js";
import { resolveRequestedOffsetPolicy } from
  "../../materialization/scales/policies/offset.js";
import { findScaleConsumers } from "./consumers/index.js";

const BASE_OPTIONS = ["id", "type", "domain", "range"];
const UNKNOWN_OPTIONS = [...BASE_OPTIONS, "unknown"];
const CLAMP_REVERSE = ["clamp", "reverse"];
const BOOLEAN_OPTIONS = ["nice", "zero", ...CLAMP_REVERSE];
const TRANSFORM_OPTIONS = ["base", "exponent", "constant"];
const POSITION_OPTIONS = [
  ...BASE_OPTIONS,
  ...BOOLEAN_OPTIONS,
  ...TRANSFORM_OPTIONS,
  "paddingInner",
  "paddingOuter",
  "padding",
  "align",
  "unknown"
];
const COLOR_OPTIONS = [...BASE_OPTIONS, "palette", "unknown"];
const SEQUENTIAL_COLOR_OPTIONS = [
  ...COLOR_OPTIONS,
  "interpolate", "midpoint",
  ...CLAMP_REVERSE
];
const OPACITY_OPTIONS = [...BASE_OPTIONS, ...BOOLEAN_OPTIONS, "unknown"];
const STROKE_WIDTH_OPTIONS = [
  ...BASE_OPTIONS, ...BOOLEAN_OPTIONS, ...TRANSFORM_OPTIONS
];
const SIZE_OPTIONS = [
  ...UNKNOWN_OPTIONS, "clamp", "reverse", "base", "exponent"
];

function optionsObject(options) {
  if (!isPlainObject(options)) {
    throw new TypeError("Encoding scale must be a plain object.");
  }
}

function validateBooleanOptions(options, properties, type) {
  for (const property of properties) {
    if (options[property] !== undefined && typeof options[property] !== "boolean") {
      throw new TypeError(`Scale ${property} must be a boolean.`);
    }
    if (type !== undefined && options[property] !== undefined) {
      validateScalePropertyForType(type, property);
    }
  }
}

function assignOptions(scale, options, existing, properties) {
  for (const property of properties) {
    const value = options[property] ?? existing?.[property];
    if (value !== undefined) scale[property] = value;
  }
  return scale;
}

function validatePaletteRange(options) {
  if (options.palette !== undefined && options.range !== undefined) {
    throw new Error("Color scale cannot specify both palette and range.");
  }
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
  const discrete = ["ordinal", "nominal"].includes(fieldType);
  const expectedType = fieldType === "temporal"
    ? "time"
    : discrete
      ? defaults.discreteType ?? "point"
      : "linear";
  const type = options.type ?? existing?.type ?? expectedType;
  if (fieldType === "temporal") validateTimeScaleType(type);
  else if (discrete) {
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
      patch: { ...options, ...(defaults.radialMapping === undefined ? {} : { radialMapping: defaults.radialMapping }) },
      defaults: {
        ...(existing === undefined && defaults.nice !== undefined
          ? { nice: defaults.nice }
          : {}),
        ...(
          existing === undefined &&
          defaults.zero !== undefined &&
          (type !== "log" || defaults.zero)
          ? { zero: defaults.zero }
          : {})
      },
      retainCoreOnTypeChange: true,
      retainCompatibleOnTypeChange: true,
      validateDomain: (_scaleType, value) =>
        discrete
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

export function resolveColorScaleDefinition(program, options, channel = "color") {
  optionsObject(options);
  validateKeys(options, COLOR_OPTIONS, "scale");
  validatePaletteRange(options);
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = findSemanticScale(program, id);
  const previous = existing?.type === "ordinal" ? existing : undefined;
  const range = options.palette === undefined
    ? options.range
    : { palette: options.palette };
  return withScaleUnknown({
    id,
    type: validateOrdinalScaleType(options.type ?? previous?.type ?? "ordinal"),
    domain: validateOrdinalDomain(options.domain ?? previous?.domain ?? "auto"),
    range: validateColorRange(range ?? previous?.range ?? "auto")
  }, { ...previous, ...options }, channel);
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
  options,
  channel = "color"
) {
  optionsObject(options);
  validateKeys(options, SEQUENTIAL_COLOR_OPTIONS, "scale");
  validatePaletteRange(options);
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = findSemanticScale(program, id);
  const previous = existing?.type === "sequential" ? existing : undefined;
  const type = options.type ?? previous?.type ?? "sequential";
  if (type !== "sequential") {
    throw new Error(`Unsupported continuous color scale type "${type}".`);
  }
  validateBooleanOptions(options, CLAMP_REVERSE);
  const requestedRange = options.palette === undefined
    ? options.range
    : { palette: options.palette };
  const scale = {
    id,
    type,
    domain: continuousDomain(options.domain ?? previous?.domain ?? "auto", fieldType),
    range: validateSequentialColorRange(
      requestedRange ?? previous?.range ?? { palette: "viridis" }
    ),
    interpolate: validateContinuousColorInterpolation(
      options.interpolate ?? previous?.interpolate ?? "rgb"
    )
  };
  const midpoint = validateSequentialMidpoint(
    Object.hasOwn(options, "midpoint") ? options.midpoint : previous?.midpoint, type, scale.domain
  );
  if (midpoint !== undefined) {
    if (fieldType !== "quantitative") {
      throw new Error("Scale midpoint requires quantitative color consumers.");
    }
    scale.midpoint = midpoint;
  }
  return withScaleUnknown(
    assignOptions(scale, options, previous, CLAMP_REVERSE),
    { ...previous, ...options },
    channel
  );
}

export function resolveQuantitativeColorScaleDefinition(
  program,
  fieldType,
  options,
  channel = "color"
) {
  optionsObject(options);
  const existing = findSemanticScale(program, options.id ?? channel);
  const existingContinuous = existing !== undefined && (
    existing.type === "sequential" ||
    ["quantize", "quantile", "threshold"].includes(existing.type)
  );
  const type = options.type ?? (
    existingContinuous ? existing.type : "sequential"
  );
  if (existingContinuous && existing.type !== type) {
    validateKeys(options, type === "sequential" ? SEQUENTIAL_COLOR_OPTIONS : [...COLOR_OPTIONS, ...CLAMP_REVERSE], "scale");
    if (fieldType !== "quantitative") throw new Error("Color scale type transition requires quantitative color.");
    return { id: existing.id, ...prepareScaleEdit(program, existing, channel, [], options) };
  }
  if (type === "sequential") {
    return resolveSequentialColorScaleDefinition(program, fieldType, options, channel);
  }
  validateKeys(options, [...COLOR_OPTIONS, ...CLAMP_REVERSE], "scale");
  if (fieldType !== "quantitative") {
    throw new Error(`Scale type "${type}" requires quantitative color.`);
  }
  validateScaleTypeForRole(type, SCALE_ROLES.discretizedColor);
  validatePaletteRange(options);
  validateBooleanOptions(options, CLAMP_REVERSE, type);
  const id = validateUserId(options.id ?? channel, "Scale id");
  const previous = existing?.type === type ? existing : undefined;
  const requestedRange = options.palette === undefined
    ? options.range
    : { palette: options.palette };
  const scale = {
    id,
    type,
    domain: validateDiscretizedColorDomain(
      type,
      options.domain ?? previous?.domain ?? "auto"
    ),
    range: validateDiscretizedColorRange(
      requestedRange ?? previous?.range ?? { palette: "viridis" }
    )
  };
  return withScaleUnknown(
    assignOptions(scale, options, previous, CLAMP_REVERSE),
    { ...existing, ...options },
    channel
  );
}

function resolveOrdinalScaleDefinition(program, options, channel, rangeValidator) {
  optionsObject(options);
  validateKeys(options, UNKNOWN_OPTIONS, "scale");
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = findSemanticScale(program, id);
  return withScaleUnknown({
    id,
    type: validateOrdinalScaleType(options.type ?? existing?.type ?? "ordinal"),
    domain: validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto"),
    range: rangeValidator(options.range ?? existing?.range ?? "auto")
  }, { ...existing, ...options }, channel);
}

export function resolveStrokeDashScaleDefinition(program, options) {
  return resolveOrdinalScaleDefinition(
    program, options, "strokeDash", validateStrokeDashRange
  );
}

export function resolveAppearanceScaleDefinition(program, channel, options) {
  optionsObject(options);
  if (channel === "size") {
    validateKeys(options, SIZE_OPTIONS, "scale");
    const id = validateUserId(options.id ?? channel, "Scale id");
    const existing = findSemanticScale(program, id);
    return {
      id,
      ...normalizeSizeScaleDefinition({ previous: existing, patch: options })
    };
  }
  validateKeys(options, UNKNOWN_OPTIONS, "scale");
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = findSemanticScale(program, id);
  return withScaleUnknown({
    id,
    type: validateOrdinalScaleType(options.type ?? existing?.type ?? "ordinal"),
    domain: validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateShapeRange(options.range ?? existing?.range ?? "auto")
  }, { ...existing, ...options }, channel);
}

export function resolveOpacityScaleDefinition(program, options) {
  optionsObject(options);
  validateKeys(options, OPACITY_OPTIONS, "scale");
  const id = validateUserId(options.id ?? "opacity", "Scale id");
  const existing = findSemanticScale(program, id);
  const type = validateLinearScaleType(options.type ?? existing?.type ?? "linear");
  validateBooleanOptions(options, BOOLEAN_OPTIONS, type);
  const scale = {
    id,
    type,
    domain: validateScaleDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateOpacityRange(options.range ?? existing?.range ?? "auto")
  };
  return withScaleUnknown(
    assignOptions(scale, options, existing, BOOLEAN_OPTIONS),
    { ...existing, ...options },
    "opacity"
  );
}

export function resolveStrokeWidthScaleDefinition(program, options) {
  optionsObject(options);
  validateKeys(options, STROKE_WIDTH_OPTIONS, "scale");
  const id = validateUserId(options.id ?? "strokeWidth", "Scale id");
  const existing = findSemanticScale(program, id);
  const type = options.type ?? existing?.type ?? "linear";
  validateScaleTypeForRole(type, SCALE_ROLES.quantitativePosition);
  validateBooleanOptions(options, BOOLEAN_OPTIONS, type);
  for (const property of TRANSFORM_OPTIONS) {
    if (options[property] !== undefined) {
      validateScalePropertyForType(type, property);
    }
  }
  const domain = validateScaleDomain(options.domain ?? existing?.domain ?? "auto");
  if (domain !== "auto" && domain.some(value => value < 0)) {
    throw new RangeError("StrokeWidth scale domain cannot contain negative values.");
  }
  const scale = {
    id,
    type,
    domain,
    range: validateStrokeWidthRange(options.range ?? existing?.range ?? "auto")
  };
  return assignOptions(
    scale, options, existing, [...BOOLEAN_OPTIONS, ...TRANSFORM_OPTIONS]
  );
}

export function resolveOffsetScaleDefinition(program, options, channel = "xOffset") {
  optionsObject(options);
  validateKeys(options, [
    "id", "type", "domain", "range", "reverse",
    "padding", "paddingInner", "paddingOuter", "align"
  ], "scale");
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = findSemanticScale(program, id);
  const type = options.type ?? existing?.type ?? "ordinal";
  if (type !== "ordinal") {
    throw new Error(`Scale type "${type}" is not valid for ${channel}.`);
  }
  if (Object.hasOwn(options, "range") && options.range !== "auto") {
    throw new Error(
      `${channel} scale range is derived from its parent categorical slot.`
    );
  }
  const consumers = findScaleConsumers(program, id).filter(
    consumer => consumer.channel === channel
  );
  const currentPolicy = resolveRequestedOffsetPolicy({
    scale: existing,
    consumers,
    markConfigs: program.markConfigs,
    id,
    channel
  });
  const policy = normalizeOffsetScalePolicy(options, currentPolicy, channel);
  const patch = Object.fromEntries(Object.entries(options).filter(
    ([property]) => !["id", "padding"].includes(property)
  ));
  return {
    id,
    ...normalizeScaleDefinition({
      type,
      previous: existing,
      patch: { ...patch, ...policy },
      allowOrdinalBandParameters: true,
      validateDomain: (_scaleType, value) => validateOrdinalDomain(value),
      validateRange: (_scaleType, value) => validateScaleRange(value)
    })
  };
}
