import { requireStringValue as requireField } from "../core/validation.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { normalizeTemporalValue, validateTemporalUnit } from "./scales/fields.js";

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
  "second",
  "week",
  "weekday"
]);

const TRANSFORM_KEYS = Object.freeze([
  "type", "field", "unit", "as", "temporalUnit", "timeZone",
  "weekStartsOn", "weekRule"
]);

const CALENDAR_FORMATTERS = new Map();

function formatter(timeZone) {
  if (!CALENDAR_FORMATTERS.has(timeZone)) {
    let value;
    try {
      value = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      });
    } catch {
      throw new RangeError(`Unsupported time zone "${timeZone}".`);
    }
    CALENDAR_FORMATTERS.set(timeZone, value);
  }
  return CALENDAR_FORMATTERS.get(timeZone);
}

function validateTimeZone(timeZone) {
  if (typeof timeZone !== "string" || timeZone.length === 0) {
    throw new TypeError("Time-unit timeZone must be a non-empty IANA time-zone name.");
  }
  formatter(timeZone);
  return timeZone;
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
  validateTemporalUnit(transform.temporalUnit);
  const field = requireField(transform.field, "Time-unit field");
  const output = requireField(transform.as, "Time-unit output field");
  if (field === output) {
    throw new Error("Time-unit input and output fields must be distinct.");
  }
  if (!TIME_UNITS.includes(transform.unit)) {
    throw new Error(`Unsupported time unit "${transform.unit}".`);
  }
  if (Object.hasOwn(transform, "timeZone")) validateTimeZone(transform.timeZone);
  const hasWeekStartsOn = Object.hasOwn(transform, "weekStartsOn");
  const hasWeekRule = Object.hasOwn(transform, "weekRule");
  if (transform.unit === "week") {
    if (!Number.isInteger(transform.weekStartsOn) ||
      transform.weekStartsOn < 0 || transform.weekStartsOn > 6) {
      throw new RangeError("Time-unit weekStartsOn must be an integer from 0 through 6.");
    }
    if (!["calendar", "iso"].includes(transform.weekRule)) {
      throw new Error(`Unsupported time-unit weekRule "${transform.weekRule}".`);
    }
    if (transform.weekRule === "iso" && transform.weekStartsOn !== 1) {
      throw new Error("Time-unit ISO weeks require weekStartsOn 1 (Monday).");
    }
  } else if (hasWeekStartsOn || hasWeekRule) {
    throw new Error("Time-unit weekStartsOn and weekRule require unit week.");
  }
  return transform;
}

export function normalizeTimeUnitTransform(args = {}) {
  const { field, unit, as, temporalUnit, timeZone } = args;
  const transform = { type: "timeUnit", field, unit, as,
    ...(temporalUnit === undefined ? {} : { temporalUnit }),
    ...(timeZone === undefined ? {} : { timeZone }) };
  if (unit === "week") {
    transform.weekStartsOn = args.weekStartsOn ?? 1;
    transform.weekRule = args.weekRule ?? "calendar";
  } else {
    if (Object.hasOwn(args, "weekStartsOn")) transform.weekStartsOn = args.weekStartsOn;
    if (Object.hasOwn(args, "weekRule")) transform.weekRule = args.weekRule;
  }
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
  if (unit === "weekday") return date.getUTCDay();
  if (unit === "week") {
    throw new Error("floorUtcTimeUnit requires a calendar week policy.");
  }
  if (unit === "day") return utcBucket(year, month, day);
  const hour = date.getUTCHours();
  if (unit === "hour") return utcBucket(year, month, day, hour);
  const minute = date.getUTCMinutes();
  if (unit === "minute") return utcBucket(year, month, day, hour, minute);
  return Math.floor(timestamp / 1000) * 1000;
}

function weekdayFromDate(year, month, day) {
  return new Date(utcTimestamp(year, month - 1, day)).getUTCDay();
}

export function calendarParts(timestamp, timeZone) {
  if (!validTimestamp(timestamp)) {
    throw new TypeError("Time-unit timestamp must represent a valid date.");
  }
  validateTimeZone(timeZone);
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(timestamp)
    .filter(part => part.type !== "literal")
    .map(part => [part.type, Number(part.value)]));
  const millisecond = ((timestamp % 1000) + 1000) % 1000;
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    millisecond,
    weekday: weekdayFromDate(parts.year, parts.month, parts.day)
  };
}

function civilTimestamp(parts) {
  const timestamp = utcTimestamp(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0
  ) + (parts.second ?? 0) * 1000 + (parts.millisecond ?? 0);
  if (!validTimestamp(timestamp)) {
    throw new RangeError("Time-unit calendar boundary is outside the supported Date range.");
  }
  return timestamp;
}

function sameCivil(left, right) {
  return ["year", "month", "day", "hour", "minute", "second", "millisecond"]
    .every(key => left[key] === right[key]);
}

function sameBucket(candidate, target, unit) {
  const keys = unit === "year" ? ["year"]
    : unit === "quarter" ? ["year", "month"]
      : unit === "month" ? ["year", "month"]
        : unit === "day" || unit === "week" ? ["year", "month", "day"]
          : unit === "hour" ? ["year", "month", "day", "hour"]
            : unit === "minute" ? ["year", "month", "day", "hour", "minute"]
              : ["year", "month", "day", "hour", "minute", "second"];
  if (unit === "quarter") {
    return candidate.year === target.year &&
      Math.floor((candidate.month - 1) / 3) === Math.floor((target.month - 1) / 3);
  }
  return keys.every(key => candidate[key] === target[key]);
}

export function resolveCalendarBoundary(localParts, timeZone, unit) {
  const naive = civilTimestamp(localParts);
  const offsets = new Set();
  for (let delta = -72; delta <= 72; delta += 6) {
    const sample = naive + delta * 3_600_000;
    if (!validTimestamp(sample)) continue;
    offsets.add(civilTimestamp(calendarParts(sample, timeZone)) - sample);
  }
  const exact = [];
  const gaps = [];
  for (const offset of offsets) {
    const candidate = naive - offset;
    if (!validTimestamp(candidate)) continue;
    const roundTrip = calendarParts(candidate, timeZone);
    if (sameCivil(roundTrip, localParts)) exact.push(candidate);
    else if (sameBucket(roundTrip, localParts, unit) &&
      civilTimestamp(roundTrip) >= naive) {
      gaps.push({ candidate, local: civilTimestamp(roundTrip) });
    }
  }
  if (exact.length > 0) return Math.min(...exact);
  if (gaps.length > 0) {
    gaps.sort((left, right) => left.local - right.local || left.candidate - right.candidate);
    return gaps[0].candidate;
  }
  throw new RangeError(`Time-unit ${unit} boundary does not exist in time zone "${timeZone}".`);
}

function addCalendarDays(parts, delta) {
  const date = new Date(utcTimestamp(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + delta);
  return {
    ...parts,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: date.getUTCDay()
  };
}

function boundaryParts(parts, transform) {
  const result = {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    millisecond: 0
  };
  if (transform.unit === "year") Object.assign(result, { month: 1, day: 1, hour: 0, minute: 0, second: 0 });
  else if (transform.unit === "quarter") Object.assign(result, {
    month: Math.floor((parts.month - 1) / 3) * 3 + 1,
    day: 1, hour: 0, minute: 0, second: 0
  });
  else if (transform.unit === "month") Object.assign(result, { day: 1, hour: 0, minute: 0, second: 0 });
  else if (["day", "week"].includes(transform.unit)) Object.assign(result, { hour: 0, minute: 0, second: 0 });
  else if (transform.unit === "hour") Object.assign(result, { minute: 0, second: 0 });
  else if (transform.unit === "minute") result.second = 0;
  if (transform.unit === "week") {
    const distance = (parts.weekday - transform.weekStartsOn + 7) % 7;
    return addCalendarDays(result, -distance);
  }
  return result;
}

export function bucketTime(timestamp, transform) {
  const timeZone = transform.timeZone ?? "UTC";
  if (transform.unit === "weekday") {
    return timeZone === "UTC"
      ? new Date(timestamp).getUTCDay()
      : calendarParts(timestamp, timeZone).weekday;
  }
  if (timeZone === "UTC") {
    if (transform.unit === "week") {
      const date = new Date(timestamp);
      const distance = (date.getUTCDay() - transform.weekStartsOn + 7) % 7;
      return utcBucket(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - distance);
    }
    return floorUtcTimeUnit(timestamp, transform.unit);
  }
  const parts = calendarParts(timestamp, timeZone);
  return resolveCalendarBoundary(boundaryParts(parts, transform), timeZone, transform.unit);
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
    const timestamp = normalizeTemporalValue(row[transform.field], transform.field, index, transform.temporalUnit);
    return {
      ...row,
      [transform.as]: bucketTime(timestamp, transform)
    };
  });
  return cloneAndFreeze(values);
}
