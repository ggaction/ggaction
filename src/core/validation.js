import { isPlainObject } from "./immutable.js";

export function validateKeys(value, supported, label) {
  for (const key of Object.keys(value)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${label} option "${key}".`);
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
    throw new TypeError(plainObjectMessage);
  }
  if (supported !== undefined) validateKeys(value, supported, label);
  if (!allowEmpty && Object.keys(value).length === 0) {
    throw new emptyError(emptyMessage);
  }
  return value;
}

export function noOptions(args, operation) {
  if (!isPlainObject(args) || Object.keys(args).length > 0) {
    throw new Error(`${operation} does not accept options.`);
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
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

export function validateUnitInterval(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(
      `${label} must be between 0 and 1 (values from 0 to 1).`
    );
  }
  return value;
}

export function validatePositiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
  return value;
}

export function validateNonNegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
  return value;
}
