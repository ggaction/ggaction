import { isPlainObject } from "../../../../core/immutable.js";
import {
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite
} from "../../../../core/validation.js";

export { validateKeys };

export function validateObject(value, supported, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  validateKeys(value, supported, label);
}

export const nonEmptyString = validateNonEmptyString;
export const nonNegative = validateNonNegativeFinite;
export const positive = validatePositiveFinite;

export { validateFontWeight } from "../../../../core/validation.js";
