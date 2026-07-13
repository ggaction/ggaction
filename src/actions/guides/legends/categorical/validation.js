import { isPlainObject } from "../../../../core/immutable.js";
import { validateKeys } from "../../../../core/validation.js";

export { validateKeys };

export function validateObject(value, supported, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  validateKeys(value, supported, label);
}

export function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

export function nonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
  return value;
}

export function positive(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
  return value;
}

export function validateFontWeight(value, label) {
  if (typeof value !== "string" && !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a string or number.`);
  }
  return value;
}
