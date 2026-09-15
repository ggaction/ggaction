import { validateRadialMapping } from "../../../grammar/scales/radial.js";
import {
  validateContinuousColorInterpolation,
  validateSequentialMidpoint,
  validateScalePropertyForType,
  validateSemanticScaleDomain,
  validateSemanticScaleRange,
  validateSemanticScaleType
} from "../../../grammar/scales/index.js";
import { findSemanticScale } from "../../../selectors/scales.js";
import { findScaleConsumers } from "../../scales/consumers/index.js";

function isOffsetScale(program, id, existing) {
  if (existing?.type !== "ordinal") return false;
  const consumers = findScaleConsumers(program, id);
  return consumers.length > 0 && consumers.every(
    consumer => ["xOffset", "yOffset"].includes(consumer.channel)
  );
}

function validateOwnedProperty(program, id, existing, property) {
  if (existing?.type !== undefined) {
    if (
      isOffsetScale(program, id, existing) &&
      ["paddingInner", "paddingOuter", "align"].includes(property)
    ) return;
    validateScalePropertyForType(existing.type, property);
  }
}

export function validateScaleSemanticValue(program, parsed, value) {
  const property = parsed.path.join(".");
  const existing = findSemanticScale(program, parsed.id);
  if (property === "midpoint") {
    if (value === "auto" || value === undefined) {
      throw new TypeError("Semantic midpoint must be a finite number; remove the property to reset it.");
    }
    return validateSequentialMidpoint(value, existing?.type ?? "sequential");
  }
  if (property === "radialMapping") return validateRadialMapping(value);
  if (property === "type") {
    validateSemanticScaleType(value);
    for (const owned of [
      "nice", "zero", "clamp", "base", "exponent", "constant", "midpoint",
      "paddingInner", "paddingOuter", "padding", "align"
    ]) {
      if (existing?.[owned] === undefined) continue;
      if (
        value === "ordinal" &&
        isOffsetScale(program, parsed.id, existing) &&
        ["paddingInner", "paddingOuter", "align"].includes(owned)
      ) continue;
      validateScalePropertyForType(value, owned);
    }
    return;
  }
  if (property === "domain") return validateSemanticScaleDomain(value);
  if (property === "emptyDomain") {
    if (!["preserve", "require-explicit"].includes(value)) {
      throw new Error('Scale emptyDomain must be "preserve" or "require-explicit".');
    }
    return;
  }
  if (property === "range") return validateSemanticScaleRange(value);
  if (["nice", "zero", "clamp", "reverse"].includes(property)) {
    if (typeof value !== "boolean") {
      throw new TypeError(`Scale ${property} must be a boolean.`);
    }
    if (property !== "reverse") {
      validateOwnedProperty(program, parsed.id, existing, property);
    }
    return;
  }
  if (["base", "exponent", "constant"].includes(property)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`Scale ${property} must be a positive finite number.`);
    }
    if (property === "base" && value === 1) {
      throw new RangeError("Scale base must not equal 1.");
    }
    validateOwnedProperty(program, parsed.id, existing, property);
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
    validateOwnedProperty(program, parsed.id, existing, property);
    return;
  }
  if (property === "paddingOuter" || property === "padding") {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Scale ${property} must be a non-negative finite number.`);
    }
    validateOwnedProperty(program, parsed.id, existing, property);
    return;
  }
  if (property === "align") {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError("Scale align must be between 0 and 1.");
    }
    validateOwnedProperty(program, parsed.id, existing, property);
  }
}
