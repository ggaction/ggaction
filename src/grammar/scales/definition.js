import { validateMeasuredRadiusScale } from "./radial.js";
import { validateContinuousColorInterpolation, validateSequentialMidpoint } from "./color.js";
import { isTransformedScaleType } from "./mapping.js";
import {
  normalizeTransformParameters,
  validateTransformedDomain
} from "./transformed.js";
import {
  isContinuousColorScaleType,
  validateScalePropertyForType
} from "./types.js";

const BOOLEAN_PROPERTIES = Object.freeze([
  "nice", "zero", "clamp", "reverse"
]);
const TYPE_PARAMETERS = Object.freeze(["base", "exponent", "constant"]);

function retainedValue(previous, patch, defaults, property, typeChanged) {
  if (Object.hasOwn(patch, property)) return patch[property];
  if (!typeChanged && Object.hasOwn(previous, property)) {
    return previous[property];
  }
  return defaults[property];
}

function validateBandParameters(definition, previous, patch, defaults, typeChanged) {
  const paddingInner = retainedValue(
    previous, patch, defaults, "paddingInner", typeChanged
  ) ?? 0;
  const paddingOuter = retainedValue(
    previous, patch, defaults, "paddingOuter", typeChanged
  ) ?? 0;
  const align = retainedValue(previous, patch, defaults, "align", typeChanged) ?? 0.5;
  if (!Number.isFinite(paddingInner) || paddingInner < 0 || paddingInner >= 1) {
    throw new RangeError(
      "Scale paddingInner must be from 0 (inclusive) to 1 (exclusive)."
    );
  }
  if (!Number.isFinite(paddingOuter) || paddingOuter < 0) {
    throw new RangeError("Scale paddingOuter must be non-negative and finite.");
  }
  if (!Number.isFinite(align) || align < 0 || align > 1) {
    throw new RangeError("Scale align must be between 0 and 1.");
  }
  Object.assign(definition, { paddingInner, paddingOuter, align });
}

function validatePointParameters(definition, previous, patch, defaults, typeChanged) {
  const padding = retainedValue(
    previous, patch, defaults, "padding", typeChanged
  ) ?? 0.5;
  const align = retainedValue(previous, patch, defaults, "align", typeChanged) ?? 0.5;
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError("Scale padding must be non-negative and finite.");
  }
  if (!Number.isFinite(align) || align < 0 || align > 1) {
    throw new RangeError("Scale align must be between 0 and 1.");
  }
  Object.assign(definition, { padding, align });
}

export function normalizeScaleDefinition({
  type,
  previous = {},
  patch = {},
  defaults = {},
  retainCoreOnTypeChange = false,
  retainCompatibleOnTypeChange = false,
  validateDomain,
  validateRange
}) {
  const typeChanged = previous.type !== undefined && previous.type !== type;
  const rawDomain = Object.hasOwn(patch, "domain")
    ? patch.domain
    : (!typeChanged || retainCoreOnTypeChange) && Object.hasOwn(previous, "domain")
      ? previous.domain
      : defaults.domain ?? "auto";
  const rawRange = Object.hasOwn(patch, "range")
    ? patch.range
    : (!typeChanged || retainCoreOnTypeChange) && Object.hasOwn(previous, "range")
      ? previous.range
      : defaults.range ?? "auto";
  const definition = {
    type,
    domain: validateDomain(type, rawDomain),
    range: validateRange(type, rawRange)
  };

  for (const property of BOOLEAN_PROPERTIES) {
    let value = retainedValue(previous, patch, defaults, property, typeChanged);
    if (
      value === undefined &&
      typeChanged &&
      retainCompatibleOnTypeChange &&
      Object.hasOwn(previous, property)
    ) {
      try {
        validateScalePropertyForType(type, property);
        value = previous[property];
      } catch {
        value = undefined;
      }
    }
    if (value === undefined) continue;
    if (typeof value !== "boolean") {
      throw new TypeError(`Scale ${property} must be a boolean.`);
    }
    validateScalePropertyForType(type, property);
    definition[property] = value;
  }

  const requested = Object.fromEntries(TYPE_PARAMETERS.flatMap(property => {
    const value = retainedValue(previous, patch, defaults, property, typeChanged);
    return value === undefined ? [] : [[property, value]];
  }));
  if (isTransformedScaleType(type)) {
    const parameters = normalizeTransformParameters(type, requested);
    if (type === "log") definition.base = parameters.base;
    if (type === "pow") definition.exponent = parameters.exponent;
    if (type === "symlog") definition.constant = parameters.constant;
    if (definition.domain !== "auto") {
      validateTransformedDomain(type, definition.domain, requested);
    }
  } else {
    for (const property of Object.keys(requested)) {
      validateScalePropertyForType(type, property);
    }
  }

  const interpolate = retainedValue(
    previous, patch, defaults, "interpolate", typeChanged
  );
  if (isContinuousColorScaleType(type)) {
    definition.interpolate = validateContinuousColorInterpolation(
      interpolate ?? "rgb"
    );
  } else if (interpolate !== undefined) {
    throw new Error(`Scale type "${type}" does not support interpolate.`);
  }

  const midpoint = validateSequentialMidpoint(
    retainedValue(previous, patch, defaults, "midpoint", typeChanged), type, definition.domain
  );
  if (midpoint !== undefined) definition.midpoint = midpoint;

  if (type === "band") {
    validateBandParameters(definition, previous, patch, defaults, typeChanged);
  } else if (type === "point") {
    validatePointParameters(definition, previous, patch, defaults, typeChanged);
  } else {
    for (const property of ["paddingInner", "paddingOuter", "padding", "align"]) {
      if (Object.hasOwn(patch, property)) {
        validateScalePropertyForType(type, property);
      }
    }
  }

  const radialMapping = Object.hasOwn(patch, "radialMapping") ? patch.radialMapping : previous.radialMapping;
  if (radialMapping !== undefined) {
    definition.radialMapping = radialMapping;
    validateMeasuredRadiusScale({ ...definition,
      ...(Object.hasOwn(patch, "unknown") || Object.hasOwn(previous, "unknown")
        ? { unknown: patch.unknown ?? previous.unknown } : {})
    }, { allowAuto: true });
  }
  return definition;
}
