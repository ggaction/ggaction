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
  validateSizeRange,
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
  withScaleUnknown
} from "../../grammar/scales/index.js";
import {
  validateRadialRange,
  validateThetaRange
} from "../../grammar/polar.js";
import { findSemanticScale } from "../../selectors/scales.js";

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

export function resolveColorScaleDefinition(program, options) {
  optionsObject(options);
  validateKeys(options, COLOR_OPTIONS, "scale");
  validatePaletteRange(options);
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
  validatePaletteRange(options);
  const id = validateUserId(options.id ?? "color", "Scale id");
  const existing = findSemanticScale(program, id);
  const type = options.type ?? existing?.type ?? "sequential";
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
    domain: continuousDomain(options.domain ?? existing?.domain ?? "auto", fieldType),
    range: validateSequentialColorRange(
      requestedRange ?? existing?.range ?? { palette: "viridis" }
    ),
    interpolate: validateContinuousColorInterpolation(
      options.interpolate ?? existing?.interpolate ?? "rgb"
    )
  };
  const midpoint = validateSequentialMidpoint(
    Object.hasOwn(options, "midpoint") ? options.midpoint : existing?.midpoint, type, scale.domain
  );
  if (midpoint !== undefined) {
    if (fieldType !== "quantitative") {
      throw new Error("Scale midpoint requires quantitative color consumers.");
    }
    scale.midpoint = midpoint;
  }
  return withScaleUnknown(
    assignOptions(scale, options, existing, CLAMP_REVERSE),
    { ...existing, ...options },
    "color"
  );
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
  validateKeys(options, [...COLOR_OPTIONS, ...CLAMP_REVERSE], "scale");
  if (fieldType !== "quantitative") {
    throw new Error(`Scale type "${type}" requires quantitative color.`);
  }
  validateScaleTypeForRole(type, SCALE_ROLES.discretizedColor);
  validatePaletteRange(options);
  validateBooleanOptions(options, CLAMP_REVERSE, type);
  const id = validateUserId(options.id ?? "color", "Scale id");
  const existing = findSemanticScale(program, id);
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
    "color"
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
  validateKeys(options, UNKNOWN_OPTIONS, "scale");
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
  return resolveOrdinalScaleDefinition(
    program, options, channel, validateScaleRange
  );
}
