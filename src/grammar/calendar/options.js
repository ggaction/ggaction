import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { normalizeCalendarDayDomain } from "../calendarDay.js";

export function normalizeCalendarOptions(input) {
  ownRecord(input, "Calendar options");
  rejectUnknownProperties(input, ["start", "end", "timeZone", "weekStartsOn", "aggregate", "missing"], "calendar options");
  const domain = normalizeCalendarDayDomain({ unit: "day", start: input.start, end: input.end, timeZone: input.timeZone });
  if (!Number.isInteger(input.weekStartsOn) || input.weekStartsOn < 0 || input.weekStartsOn > 6) {
    throw new RangeError("Calendar weekStartsOn must be an integer from 0 through 6.");
  }
  if (!["count", "sum", "mean", "median", "min", "max"].includes(input.aggregate)) {
    throw new TypeError("Calendar aggregate must be count, sum, mean, median, min or max.");
  }
  if (!["empty", "omit"].includes(input.missing)) throw new TypeError("Calendar missing must be empty or omit.");
  return cloneAndFreeze({ start: domain.start, end: domain.end, timeZone: domain.timeZone,
    weekStartsOn: input.weekStartsOn, aggregate: input.aggregate, missing: input.missing });
}
