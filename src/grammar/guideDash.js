import { isPlainObject } from "../core/immutable.js";
import { validateGeneratedItemLimit } from "../core/validation.js";

export function validateGuideDash(value, label = "Guide strokeDash") {
  if (!Array.isArray(value) || value.length % 2 !== 0 ||
      !value.every(item => Number.isFinite(item) && item >= 0)) {
    throw new TypeError(`${label} must be an even-length array of non-negative finite numbers.`);
  }
  validateGeneratedItemLimit(value.length, label);
  return value;
}

export function normalizeGuideDashMap(value, { reset = true } = {}) {
  if (value === "auto" && reset) return undefined;
  if (!Array.isArray(value)) throw new TypeError("Guide strokeDashMap must be an array.");
  validateGeneratedItemLimit(value.length, "Guide strokeDashMap count");
  const keys = new Set();
  const result = value.map(entry => {
    if (!isPlainObject(entry) || Reflect.ownKeys(entry).length !== 2 ||
        !Object.hasOwn(entry, "value") || !Object.hasOwn(entry, "strokeDash")) {
      throw new TypeError("Guide strokeDashMap entries must contain exactly value and strokeDash.");
    }
    if (!["string", "boolean"].includes(typeof entry.value) && !Number.isFinite(entry.value)) {
      throw new TypeError("Guide strokeDashMap values must be strings, booleans, or finite numbers.");
    }
    if (keys.has(entry.value)) throw new Error("Guide strokeDashMap contains a duplicate typed value.");
    keys.add(entry.value);
    validateGuideDash(entry.strokeDash);
    return Object.freeze({ value: entry.value, strokeDash: Object.freeze([...entry.strokeDash]) });
  });
  return result.length === 0 ? undefined : Object.freeze(result);
}

export function patchGuideDash(previous, patch) {
  const result = { ...previous };
  if (Object.hasOwn(patch, "strokeDash")) {
    validateGuideDash(patch.strokeDash);
    result.strokeDash = [...patch.strokeDash];
  }
  if (Object.hasOwn(patch, "strokeDashMap")) {
    const map = normalizeGuideDashMap(patch.strokeDashMap);
    if (map === undefined) delete result.strokeDashMap;
    else result.strokeDashMap = map;
  }
  return result;
}

export function resolveGuideDashes(values, config) {
  const map = new Map(config.strokeDashMap?.map(entry => [entry.value, entry.strokeDash]));
  return values.map(value => map.get(value) ?? config.strokeDash ?? []);
}
