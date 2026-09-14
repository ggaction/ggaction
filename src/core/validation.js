import { annotateError } from "./diagnostics.js";
import { isPlainObject } from "./immutable.js";

export const MAX_GENERATED_ITEMS = 10_000;
export const MAX_WORK_ITEMS = 10_000_000;

export function validateDataRows(values, label = "Dataset") {
  if (!Array.isArray(values)) {
    throw annotateError(new TypeError(`${label} requires values to be an array.`), { code: "invalid-value", optionPath: "values" });
  }
  for (let index = 0; index < values.length; index += 1) {
    if (!Object.hasOwn(values, index) || !isPlainObject(values[index])) {
      throw annotateError(new TypeError(`${label} requires every row to be a plain object; invalid row at index ${index}.`), { code: "invalid-value", optionPath: `values[${index}]` });
    }
  }
}

export function validateGeneratedItemLimit(
  value,
  label,
  maximum = MAX_GENERATED_ITEMS
) {
  if (value > maximum) {
    throw annotateError(new RangeError(`${label} must not exceed ${maximum}.`), { code: "resource-limit", optionPath: label, limit: maximum, actual: value });
  }
  return value;
}

export function validateWorkLimit(value, label) {
  return validateGeneratedItemLimit(value, label, MAX_WORK_ITEMS);
}

export function validateKeys(value, supported, label) {
  for (const key of Object.keys(value)) {
    if (!supported.includes(key)) {
      throw annotateError(new Error(`Unknown ${label} option "${key}".`), { code: "invalid-option", optionPath: key });
    }
  }
}

export function validateOptionObject(value, supported, label, {
  allowEmpty = true,
  plainObjectMessage = `${label} options must be a plain object.`,
  emptyMessage = `${label} requires at least one option.`,
  emptyError = TypeError
} = {}) {
  if (!isPlainObject(value)) {
    throw annotateError(new TypeError(plainObjectMessage), { code: "invalid-option" });
  }
  if (supported !== undefined) validateKeys(value, supported, label);
  if (!allowEmpty && Object.keys(value).length === 0) {
    throw annotateError(new emptyError(emptyMessage), { code: "invalid-option" });
  }
  return value;
}

export function noOptions(args, operation) {
  if (!isPlainObject(args) || Object.keys(args).length > 0) {
    throw annotateError(new Error(`${operation} does not accept options.`), { code: "invalid-option", operation });
  }
}

export function sameOrderedValues(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function validateNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw annotateError(new TypeError(`${label} must be a non-empty string.`), { code: "invalid-value", optionPath: label });
  }
  return value;
}

export function validateUnitInterval(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw annotateError(new RangeError(
      `${label} must be between 0 and 1 (values from 0 to 1).`
    ), { code: "invalid-value", optionPath: label });
  }
  return value;
}

export function validatePositiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw annotateError(new RangeError(`${label} must be a positive finite number.`), { code: "invalid-value", optionPath: label });
  }
  return value;
}

export function validateNonNegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw annotateError(new RangeError(`${label} must be a non-negative finite number.`), { code: "invalid-value", optionPath: label });
  }
  return value;
}
