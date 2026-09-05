import { validateRadialMapping } from "../../../grammar/scales/radial.js";
import {
  validateContinuousColorInterpolation,
  validateScalePropertyForType,
  validateSemanticScaleDomain,
  validateSemanticScaleRange,
  validateSemanticScaleType
} from "../../../grammar/scales/index.js";
import { findSemanticScale } from "../../../selectors/scales.js";

function validateOwnedProperty(existing, property) {
  if (existing?.type !== undefined) {
    validateScalePropertyForType(existing.type, property);
  }
}

export function validateScaleSemanticValue(program, parsed, value) {
  const property = parsed.path.join(".");
  const existing = findSemanticScale(program, parsed.id);
  if (property === "radialMapping") return validateRadialMapping(value);
  if (property === "type") {
    validateSemanticScaleType(value);
    for (const owned of [
      "nice", "zero", "clamp", "base", "exponent", "constant",
      "paddingInner", "paddingOuter", "padding", "align"
    ]) {
      if (existing?.[owned] !== undefined) validateScalePropertyForType(value, owned);
    }
    return;
  }
  if (property === "domain") return validateSemanticScaleDomain(value);
  if (property === "range") return validateSemanticScaleRange(value);
  if (["nice", "zero", "clamp", "reverse"].includes(property)) {
    if (typeof value !== "boolean") {
      throw new TypeError(`Scale ${property} must be a boolean.`);
    }
    if (property !== "reverse") validateOwnedProperty(existing, property);
    return;
  }
  if (["base", "exponent", "constant"].includes(property)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`Scale ${property} must be a positive finite number.`);
    }
    if (property === "base" && value === 1) {
      throw new RangeError("Scale base must not equal 1.");
    }
    validateOwnedProperty(existing, property);
    return;
  }
  if (property === "interpolate") {
    validateContinuousColorInterpolation(value);
    return;
  }
  if (property === "paddingInner") {
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError(
        "Scale paddingInner must be from 0 (inclusive) to 1 (exclusive)."
      );
    }
    validateOwnedProperty(existing, property);
    return;
  }
  if (property === "paddingOuter" || property === "padding") {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Scale ${property} must be a non-negative finite number.`);
    }
    validateOwnedProperty(existing, property);
    return;
  }
  if (property === "align") {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError("Scale align must be between 0 and 1.");
    }
    validateOwnedProperty(existing, property);
  }
}
