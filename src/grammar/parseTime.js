import { normalizeTemporalValue } from "./scales/fields.js";
import { ownRecord } from "../core/ownData.js";
import { calendarParts, resolveCalendarBoundary, validTimestamp, validateTimeZone } from "./timeUnit.js";

export const PARSE_TIME_FORMATS = Object.freeze([
  "auto", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"
]);

export function validateParseTimeFormat(format = "auto") {
  if (!PARSE_TIME_FORMATS.includes(format)) {
    throw new Error(`Unsupported parseTime format "${format}".`);
  }
  return format;
}

// Explicit calendar formats are UTC and reject rollover, rather than guessing
// the day/month order. Invalid or nullish values remain missing data as null.
export function parseTimeValue(value, format = "auto") {
  validateParseTimeFormat(format);
  if (value === null || value === undefined) return null;
  if (format === "auto") {
    try { return normalizeTemporalValue(value); }
    catch (error) {
      if (error instanceof TypeError || error instanceof RangeError) return null;
      throw error;
    }
  }
  if (typeof value !== "string") return null;
  const match = (format === "%Y-%m-%d"
    ? /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/).exec(value.trim());
  if (!match) return null;
  const numbers = match.slice(1).map(Number);
  const [year, month, day] = format === "%Y-%m-%d" ? numbers
    : format === "%d/%m/%Y" ? [numbers[2], numbers[1], numbers[0]]
      : [numbers[2], numbers[0], numbers[1]];
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day && Number.isFinite(date.getTime())
    ? date.getTime() : null;
}

// Source parsing has an explicit civil-time contract. It intentionally does
// not change the historical permissive parseTimeValue("auto") behavior.
export function validateDataDateOptions(options) {
  ownRecord(options, "Data date options");
  if (typeof options.timeZone !== "string" || /^[+-]/.test(options.timeZone)) {
    throw new TypeError("Data date parsing requires explicit UTC or IANA timeZone.");
  }
  validateTimeZone(options.timeZone);
  if (!["iso", ...PARSE_TIME_FORMATS.filter(format => format !== "auto")].includes(options.format ?? "%Y-%m-%d")) {
    throw new TypeError("Data date parsing requires an explicit calendar format or iso.");
  }
  return options;
}

export function parseDataDateValue(value, options) {
  validateDataDateOptions(options);
  if (typeof value === "number" && Number.isInteger(value) && validTimestamp(value)) return value;
  if (typeof value !== "string") throw new TypeError("Data date requires a valid date string or epoch milliseconds.");
  const format = options.format ?? "%Y-%m-%d";
  let timestamp, zone;
  if (format !== "iso") timestamp = parseTimeValue(value, format);
  else {
    const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
    if (!match) throw new TypeError("Data date contains malformed ISO date/time.");
    zone = match[6];
    timestamp = parseIsoOffsetValue(`${match[1]}T${match[2] ?? "00"}:${match[3] ?? "00"}:${match[4] ?? "00"}.${(match[5] ?? "").padEnd(3, "0")}${zone ?? "Z"}`);
  }
  if (timestamp === null || !validTimestamp(timestamp)) throw new RangeError("Data date contains invalid calendar values.");
  if (zone) return timestamp;
  const civil = calendarParts(timestamp, "UTC");
  const resolved = resolveCalendarBoundary(civil, options.timeZone, "second");
  const roundTrip = calendarParts(resolved, options.timeZone);
  if (["year", "month", "day", "hour", "minute", "second", "millisecond"].some(key => civil[key] !== roundTrip[key])) {
    throw new RangeError("Data date does not exist in its declared timeZone.");
  }
  return resolved;
}

export function parseIsoOffsetValue(text) {
  const match = /^(\d{4}|[+-]\d{6})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(text);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  if (match[1] === "-000000" || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (day > [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]) return null;
  if (match[8] !== "Z" && (Number(match[8].slice(1, 3)) > 23 || Number(match[8].slice(4)) > 59)) return null;
  const result = Date.parse(text);
  return Number.isFinite(result) ? result : null;
}
