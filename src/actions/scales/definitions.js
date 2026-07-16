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
  validateTimeScaleType,
  normalizeTransformParameters,
  SCALE_ROLES,
  validateScalePropertyForType,
  validateScaleTypeForRole
} from "../../grammar/scales.js";
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
  "constant"
]);
const COLOR_OPTIONS = Object.freeze([...BASE_OPTIONS, "palette"]);
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
    : ["ordinal", "nominal"].includes(fieldType) ? "ordinal" : "linear";
  const type = options.type ?? existing?.type ?? expectedType;
  if (fieldType === "temporal") validateTimeScaleType(type);
  else if (["ordinal", "nominal"].includes(fieldType)) {
    validateOrdinalScaleType(type);
  }
  else validateScaleTypeForRole(type, SCALE_ROLES.quantitativePosition);
  for (const property of ["nice", "zero", "clamp", "reverse"]) {
    if (options[property] !== undefined && typeof options[property] !== "boolean") {
      throw new TypeError(`Scale ${property} must be a boolean.`);
    }
    if (options[property] !== undefined) {
      validateScalePropertyForType(type, property);
    }
  }
  const scale = {
    id,
    type,
    domain: ["ordinal", "nominal"].includes(fieldType)
      ? validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto")
      : validateScaleDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateScaleRange(options.range ?? existing?.range ?? "auto")
  };
  const nice = options.nice ?? existing?.nice ?? (
    existing === undefined ? defaults.nice : undefined
  );
  const zero = options.zero ?? existing?.zero ?? (
    existing === undefined ? defaults.zero : undefined
  );
  const clamp = options.clamp ?? existing?.clamp;
  const reverse = options.reverse ?? existing?.reverse;
  if (nice !== undefined) {
    validateScalePropertyForType(type, "nice");
    scale.nice = nice;
  }
  if (zero !== undefined) {
    validateScalePropertyForType(type, "zero");
    scale.zero = zero;
  }
  if (clamp !== undefined) {
    validateScalePropertyForType(type, "clamp");
    scale.clamp = clamp;
  }
  if (reverse !== undefined) scale.reverse = reverse;
  if (["log", "pow", "sqrt", "symlog"].includes(type)) {
    const sameType = existing?.type === type;
    const requested = Object.fromEntries([
      ["base", options.base ?? (sameType ? existing?.base : undefined)],
      ["exponent", options.exponent ?? (sameType ? existing?.exponent : undefined)],
      ["constant", options.constant ?? (sameType ? existing?.constant : undefined)]
    ].filter(([, value]) => value !== undefined));
    const parameters = normalizeTransformParameters(type, requested);
    if (type === "log") scale.base = parameters.base;
    if (type === "pow") scale.exponent = parameters.exponent;
    if (type === "symlog") scale.constant = parameters.constant;
  } else {
    for (const property of ["base", "exponent", "constant"]) {
      if (options[property] !== undefined) {
        validateScalePropertyForType(type, property);
      }
    }
  }
  return scale;
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
  return {
    id,
    type: validateOrdinalScaleType(options.type ?? existing?.type ?? "ordinal"),
    domain: validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateColorRange(range ?? existing?.range ?? "auto")
  };
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
  return scale;
}

export function resolveStrokeDashScaleDefinition(program, options) {
  optionsObject(options);
  validateKeys(options, BASE_OPTIONS, "scale");
  const id = validateUserId(options.id ?? "strokeDash", "Scale id");
  const existing = findSemanticScale(program, id);
  return {
    id,
    type: validateOrdinalScaleType(options.type ?? existing?.type ?? "ordinal"),
    domain: validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateStrokeDashRange(options.range ?? existing?.range ?? "auto")
  };
}

export function resolveAppearanceScaleDefinition(program, channel, options) {
  optionsObject(options);
  validateKeys(options, BASE_OPTIONS, "scale");
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = findSemanticScale(program, id);
  const shape = channel === "shape";
  return {
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
  };
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
  return scale;
}

export function resolveOffsetScaleDefinition(program, options) {
  optionsObject(options);
  validateKeys(options, BASE_OPTIONS, "scale");
  const id = validateUserId(options.id ?? "xOffset", "Scale id");
  const existing = findSemanticScale(program, id);
  return {
    id,
    type: validateOrdinalScaleType(options.type ?? existing?.type ?? "ordinal"),
    domain: validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateScaleRange(options.range ?? existing?.range ?? "auto")
  };
}
