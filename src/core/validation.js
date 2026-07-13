import { isPlainObject } from "./immutable.js";

export function validateKeys(value, supported, label) {
  for (const key of Object.keys(value)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${label} option "${key}".`);
    }
  }
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
