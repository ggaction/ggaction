import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { normalizeTemporalValue } from "./scales/fields.js";

export function utcTimestamp(
  year,
  month = 0,
  day = 1,
  hour = 0,
  minute = 0
) {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(hour, minute, 0, 0);
  return date.getTime();
}

export function validTimestamp(value) {
  return Number.isFinite(value) && Number.isFinite(new Date(value).getTime());
}

function utcBucket(...parts) {
  const timestamp = utcTimestamp(...parts);
  if (!validTimestamp(timestamp)) {
    throw new RangeError("Time-unit bucket start is outside the supported Date range.");
  }
  return timestamp;
}

export const TIME_UNITS = cloneAndFreeze([
  "year",
  "quarter",
  "month",
  "day",
  "hour",
  "minute",
  "second"
]);

const TRANSFORM_KEYS = Object.freeze(["type", "field", "unit", "as"]);

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function rejectUnknownKeys(value) {
  const unknown = Object.keys(value).find(key => !TRANSFORM_KEYS.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown time-unit transform property "${unknown}".`);
  }
}

export function validateTimeUnitTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Time-unit transform must be a plain object.");
  }
  rejectUnknownKeys(transform);
  if (transform.type !== "timeUnit") {
    throw new Error(`Unsupported time-unit transform "${transform.type}".`);
  }
  const field = requireField(transform.field, "Time-unit field");
  const output = requireField(transform.as, "Time-unit output field");
  if (field === output) {
    throw new Error("Time-unit input and output fields must be distinct.");
  }
  if (!TIME_UNITS.includes(transform.unit)) {
    throw new Error(`Unsupported time unit "${transform.unit}".`);
  }
  return transform;
}

export function normalizeTimeUnitTransform({ field, unit, as } = {}) {
  const transform = { type: "timeUnit", field, unit, as };
  validateTimeUnitTransform(transform);
  return cloneAndFreeze(transform);
}

export function floorUtcTimeUnit(timestamp, unit) {
  if (!Number.isFinite(timestamp)) {
    throw new TypeError("Time-unit timestamp must be finite.");
  }
  if (!TIME_UNITS.includes(unit)) {
    throw new Error(`Unsupported time unit "${unit}".`);
  }
  const date = new Date(timestamp);
  if (!validTimestamp(timestamp)) {
    throw new TypeError("Time-unit timestamp must represent a valid date.");
  }
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (unit === "year") return utcBucket(year);
  if (unit === "quarter") return utcBucket(year, Math.floor(month / 3) * 3);
  if (unit === "month") return utcBucket(year, month);
  const day = date.getUTCDate();
  if (unit === "day") return utcBucket(year, month, day);
  const hour = date.getUTCHours();
  if (unit === "hour") return utcBucket(year, month, day, hour);
  const minute = date.getUTCMinutes();
  if (unit === "minute") return utcBucket(year, month, day, hour, minute);
  return Math.floor(timestamp / 1000) * 1000;
}

export function deriveTimeUnitRows(rows, transform) {
  validateTimeUnitTransform(transform);
  if (!Array.isArray(rows) || !rows.every(isPlainObject)) {
    throw new TypeError("Time-unit source must contain plain row objects.");
  }
  const values = rows.map((row, index) => {
    if (!Object.hasOwn(row, transform.field)) {
      throw new Error(
        `Time-unit source does not contain field "${transform.field}" at row ${index}.`
      );
    }
    if (Object.hasOwn(row, transform.as)) {
      throw new Error(`Time-unit output field "${transform.as}" already exists.`);
    }
    const timestamp = normalizeTemporalValue(row[transform.field], transform.field, index);
    return {
      ...row,
      [transform.as]: floorUtcTimeUnit(timestamp, transform.unit)
    };
  });
  return cloneAndFreeze(values);
}
