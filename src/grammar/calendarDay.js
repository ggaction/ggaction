import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";
import { parseTimeValue } from "./parseTime.js";
import { CALENDAR_BOUNDARY_WORK, calendarParts, resolveCalendarBoundary, validTimestamp, validateTimeZone } from "./timeUnit.js";

function civilDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${label} must be a strict YYYY-MM-DD date.`);
  }
  const timestamp = parseTimeValue(value, "%Y-%m-%d");
  if (timestamp === null) throw new RangeError(`${label} must be a valid Gregorian date.`);
  return timestamp;
}

function prepareCalendarDayDomain(options) {
  ownRecord(options, "Calendar day domain");
  rejectUnknownProperties(options, ["unit", "start", "end", "timeZone"], "calendar day domain");
  if (options.unit !== "day") throw new Error('Calendar day domain unit must be "day".');
  const start = civilDate(options.start, "Calendar start"), end = civilDate(options.end, "Calendar end");
  if (start > end) throw new RangeError("Calendar start must not be after end.");
  // These are UTC representations of civil dates, used only as Gregorian day
  // ordinals. Zoned instants are never advanced by a fixed millisecond duration.
  const count = (end - start) / 86_400_000 + 1;
  validateGeneratedItemLimit(count, "Calendar day domain count");
  validateWorkLimit(count * (CALENDAR_BOUNDARY_WORK + 1), "Calendar day domain work");
  if (typeof options.timeZone === "string" && /^[+-]/.test(options.timeZone)) {
    throw new TypeError("Calendar timeZone requires UTC or an IANA name.");
  }
  validateTimeZone(options.timeZone);
  return { start, count };
}

export function normalizeCalendarDayDomain(options) {
  prepareCalendarDayDomain(options);
  return cloneAndFreeze({ unit: "day", start: options.start, end: options.end, timeZone: options.timeZone });
}

export function calendarDayDomainMetrics(options) {
  const { count } = prepareCalendarDayDomain(options);
  return Object.freeze({ count, work: count * (CALENDAR_BOUNDARY_WORK + 1) });
}

export function deriveCalendarDayDomain(options) {
  const { start, count } = prepareCalendarDayDomain(options);
  const cursor = new Date(start), values = [];
  for (let index = 0; index < count; index += 1) {
    const target = { year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1,
      day: cursor.getUTCDate(), hour: 0, minute: 0, second: 0, millisecond: 0 };
    const instant = options.timeZone === "UTC" ? cursor.getTime()
      : resolveCalendarBoundary(target, options.timeZone, "day");
    const roundTrip = calendarParts(instant, options.timeZone);
    if (!validTimestamp(instant) || (index > 0 && instant <= values[index - 1]) ||
        roundTrip.year !== target.year || roundTrip.month !== target.month || roundTrip.day !== target.day) {
      throw new RangeError("Calendar day boundary must roundtrip to the requested civil date in increasing order.");
    }
    values.push(instant);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cloneAndFreeze(values);
}
