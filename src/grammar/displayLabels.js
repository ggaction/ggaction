import { isPlainObject } from "../core/immutable.js";

const ENTRY_KEYS = Object.freeze(["value", "label"]);

export function sameDisplayLabelValue(left, right) {
  return left === right;
}

function isDisplayLabelValue(value) {
  return value === null || typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
}

export function normalizeDisplayLabelMap(value, label = "labelMap") {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array.`);
  }
  const normalized = [];
  for (const [index, entry] of value.entries()) {
    if (!isPlainObject(entry)) {
      throw new TypeError(`${label}[${index}] must be a plain object.`);
    }
    const keys = Reflect.ownKeys(entry);
    if (keys.length !== ENTRY_KEYS.length ||
        ENTRY_KEYS.some(key => !Object.hasOwn(entry, key))) {
      throw new Error(`${label}[${index}] must contain exactly value and label.`);
    }
    if (!isDisplayLabelValue(entry.value)) {
      throw new TypeError(
        `${label}[${index}].value must be a string, boolean, null, or finite number.`
      );
    }
    if (typeof entry.label !== "string") {
      throw new TypeError(`${label}[${index}].label must be a string.`);
    }
    if (normalized.some(previous =>
      sameDisplayLabelValue(previous.value, entry.value))) {
      throw new Error(`${label} contains a duplicate typed value.`);
    }
    normalized.push(Object.freeze({ value: entry.value, label: entry.label }));
  }
  return Object.freeze(normalized);
}

export function resolveDisplayLabel(value, map, fallback) {
  if (map !== undefined) {
    for (const entry of map) {
      if (sameDisplayLabelValue(entry.value, value)) return entry.label;
    }
  }
  const resolved = fallback(value);
  if (typeof resolved !== "string") {
    throw new TypeError("Display label fallback must return a string.");
  }
  return resolved;
}
