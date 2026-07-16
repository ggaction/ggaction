import { mapLinearValues } from "./continuous.js";
import { mapTransformedValues } from "./transformed.js";
import { SCALE_ROLES, validateScaleTypeForRole } from "./types.js";

const TRANSFORMED_TYPES = new Set(["log", "pow", "sqrt", "symlog"]);

export function isTransformedScaleType(type) {
  return TRANSFORMED_TYPES.has(type);
}

export function mapContinuousScaleValues(values, scale) {
  if (isTransformedScaleType(scale?.type)) {
    validateScaleTypeForRole(scale.type, SCALE_ROLES.quantitativePosition);
    return mapTransformedValues(values, scale.domain, scale.range, {
      type: scale.type,
      clamp: scale.clamp ?? false,
      ...(Object.hasOwn(scale, "unknown") ? { unknown: scale.unknown } : {}),
      ...(scale.type === "log" ? { base: scale.base } : {}),
      ...(scale.type === "pow" ? { exponent: scale.exponent } : {}),
      ...(scale.type === "symlog" ? { constant: scale.constant } : {})
    });
  }
  return mapLinearValues(values, scale.domain, scale.range, {
    clamp: scale.clamp ?? false,
    ...(Object.hasOwn(scale, "unknown") ? { unknown: scale.unknown } : {})
  });
}
