import {
  validateNonEmptyString,
  validateNonNegativeFinite
} from "../core/validation.js";

export function validateRuleStroke(value, label = "encodeStroke") {
  return validateNonEmptyString(value, label);
}

export function validateRuleStrokeWidth(value, label = "encodeStrokeWidth") {
  return validateNonNegativeFinite(value, label);
}
