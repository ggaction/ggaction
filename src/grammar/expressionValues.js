import { annotateError } from "../core/diagnostics.js";
import { ownArray, ownRecord } from "../core/ownData.js";

export const EXPRESSION_LIMITS = Object.freeze({
  depth: 64, nodes: 4096, args: 64, path: 8, rowWork: 10_000_000,
  string: 1_048_576, array: 100_000, valueWork: 10_000_000
});

export function limit(value, maximum, label) {
  if (value > maximum) throw annotateError(
    new RangeError(`Expression ${label} exceeds its resource limit.`),
    { code: "resource-limit", optionPath: label, limit: maximum, actual: value }
  );
}

export function record(value, required, optional = [], label = "Expression") {
  ownRecord(value, label);
  const keys = Object.keys(value);
  if (required.some(key => !Object.hasOwn(value, key)) ||
      keys.some(key => !required.includes(key) && !optional.includes(key))) {
    throw new TypeError(`${label} has missing or unknown properties.`);
  }
  return value;
}

export function array(value, maximum, label, dense = true) {
  if (Array.isArray(value)) limit(value.length, maximum, label);
  return ownArray(value, label, dense);
}

export function name(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be a nonempty string.`);
  limit(value.length, EXPRESSION_LIMITS.string, label);
  return value;
}

export function valueType(value) {
  if (value === null) return "null";
  if (value === undefined) return "missing";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function checkType(type, allowed, label) {
  if (Array.isArray(type)) {
    for (const item of type) checkType(item, allowed, label);
    return;
  }
  if (!["unknown", "mixed", "null", "missing"].includes(type) && !allowed.includes(type)) {
    throw new TypeError(`${label} requires ${allowed.join(" or ")}.`);
  }
}

export function scalar(value, label = "Expression result") {
  const type = valueType(value);
  if (!["number", "string", "boolean", "null", "missing"].includes(type)) {
    throw new TypeError(`${label} must be scalar.`);
  }
  if (type === "number" && !Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  if (type === "string") limit(value.length, EXPRESSION_LIMITS.string, "string");
  return value;
}

export function charge(state, amount) {
  state.work += amount;
  limit(state.work, EXPRESSION_LIMITS.valueWork, "valueWork");
}

export function operand(value, state) {
  if (Array.isArray(value)) {
    // Charge the scan before descriptor allocation and validation.
    limit(value.length, EXPRESSION_LIMITS.array, "array");
    charge(state, value.length);
    ownArray(value, "Expression array", false);
  } else {
    scalar(value);
    if (typeof value === "string") charge(state, value.length);
  }
  return value;
}

export function missing(state, kind) {
  state.counts[kind] += 1;
  return undefined;
}

export function numericResult(value, state) {
  return Number.isFinite(value) ? value : missing(state, "nonFinite");
}
