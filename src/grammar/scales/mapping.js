import { ownRecord, ownArray } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { mapMeasuredRadiusValues } from "./radial.js";
import { mapLinearValues, prepareLinearScalar } from "./continuous.js";
import { mapTransformedValues, prepareTransformedScalar } from "./transformed.js";
import { SCALE_ROLES, validateScaleTypeForRole } from "./types.js";

const TRANSFORMED_TYPES = new Set(["log", "pow", "sqrt", "symlog"]);

export function isTransformedScaleType(type) {
  return TRANSFORMED_TYPES.has(type);
}

export function mapContinuousScaleValues(values, scale) {
  if (scale?.radialMapping !== undefined) return mapMeasuredRadiusValues(values, scale);
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

// Prepared position scalars are a private capability, never a property on a
// caller scale or a proof inferred from freezing, cloning or core ownership.
const scalarMappers = new WeakMap();
export function prepareContinuousScaleScalar(input) {
  ownRecord(input, "Prepared continuous scale");
  for (const key of ["type", "domain", "range"]) {
    if (!Object.hasOwn(input, key)) throw new TypeError(`Prepared continuous scale requires ${key}.`);
  }
  const type = input.type;
  if (!["linear", "time", "log", "pow", "sqrt", "symlog"].includes(type)) {
    throw new TypeError("Prepared scalar requires a supported continuous scale.");
  }
  const parameter = type === "log" ? "base" : type === "pow" ? "exponent" : type === "symlog" ? "constant" : undefined;
  rejectUnknownProperties(input, ["type", "domain", "range", "clamp", ...(parameter === undefined ? [] : [parameter])], "prepared continuous scale");
  if (Object.values(input).some(value => value === undefined)) throw new TypeError("Prepared continuous scale values cannot be undefined.");
  const clamp = Object.hasOwn(input, "clamp") ? input.clamp : false;
  if (typeof clamp !== "boolean") throw new TypeError("Prepared continuous scale clamp must be boolean.");
  ownArray(input.domain, "Prepared scale domain");
  ownArray(input.range, "Prepared scale range");
  const mapper = isTransformedScaleType(type)
    ? prepareTransformedScalar(input.domain, input.range, { type, clamp,
      ...(parameter !== undefined && Object.hasOwn(input, parameter) ? { [parameter]: input[parameter] } : {}) })
    : prepareLinearScalar(input.domain, input.range, clamp);
  const token = Object.freeze({});
  scalarMappers.set(token, mapper);
  return token;
}

export function mapPreparedContinuousScaleValue(token, value) {
  const mapper = scalarMappers.get(token);
  if (mapper === undefined) throw new TypeError("Prepared scalar requires its exact private token.");
  return mapper(value);
}
