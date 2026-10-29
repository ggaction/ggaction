import { ownRecord } from "../core/ownData.js";

const KEYS = Object.freeze(["min", "max", "inclusive", "minInclusive", "maxInclusive"]);
const ordered = value => Number.isFinite(value) || typeof value === "string";

// Data filters and final-item selectors share typed endpoint semantics.
export function normalizeOrderedRange(range, label = "Range") {
  ownRecord(range, label);
  range = Object.assign(Object.create(null), range);
  const unknown = Object.keys(range).find(key => !KEYS.includes(key));
  if (unknown !== undefined) throw new Error(`Unknown ${label.toLowerCase()} property "${unknown}".`);
  const hasMin = Object.hasOwn(range, "min"), hasMax = Object.hasOwn(range, "max");
  if (!hasMin && !hasMax) throw new TypeError(`${label} requires min or max.`);
  if ((hasMin && !ordered(range.min)) || (hasMax && !ordered(range.max))) {
    throw new TypeError(`${label} endpoints must be finite numbers or strings.`);
  }
  if (hasMin && hasMax && typeof range.min !== typeof range.max) {
    throw new TypeError(`${label} endpoints must use one type.`);
  }
  if (hasMin && hasMax && range.min > range.max) throw new RangeError(`${label} min must not exceed max.`);
  if (range.inclusive !== undefined && typeof range.inclusive !== "boolean") {
    throw new TypeError(`${label} inclusive must be a boolean.`);
  }
  if (range.inclusive !== undefined && (range.minInclusive !== undefined || range.maxInclusive !== undefined)) {
    throw new Error(`${label} cannot combine inclusive with endpoint inclusivity.`);
  }
  for (const [key, endpoint] of [["minInclusive", "min"], ["maxInclusive", "max"]]) {
    if (range[key] !== undefined && typeof range[key] !== "boolean") throw new TypeError(`${label} ${key} must be a boolean.`);
    if (range[key] !== undefined && !Object.hasOwn(range, endpoint)) throw new Error(`${label} ${key} requires ${endpoint}.`);
  }
  return Object.freeze({
    ...(hasMin ? { min: range.min, minInclusive: range.inclusive ?? range.minInclusive ?? true } : {}),
    ...(hasMax ? { max: range.max, maxInclusive: range.inclusive ?? range.maxInclusive ?? true } : {})
  });
}

export function orderedRangeContains(value, range) {
  if (!ordered(value)) return false;
  const min = Object.hasOwn(range, "min") ? range.min : undefined;
  const max = Object.hasOwn(range, "max") ? range.max : undefined;
  const inclusive = Object.hasOwn(range, "inclusive") ? range.inclusive ?? true : true;
  const minInclusive = Object.hasOwn(range, "minInclusive") ? range.minInclusive ?? inclusive : inclusive;
  const maxInclusive = Object.hasOwn(range, "maxInclusive") ? range.maxInclusive ?? inclusive : inclusive;
  if (min !== undefined && (typeof value !== typeof min || value < min || (value === min && !minInclusive))) return false;
  if (max !== undefined && (typeof value !== typeof max || value > max || (value === max && !maxInclusive))) return false;
  return true;
}
