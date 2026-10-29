import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, requireStringValue, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { normalizeCalendarOptions } from "./options.js";

export const CALENDAR_FIELDS = Object.freeze(["date", "value", "start", "end", "timeZone", "weekStartsOn", "aggregate", "missing"]);

export function normalizeCalendarDefinition(input) {
  ownRecord(input, "Calendar definition");
  rejectUnknownProperties(input, CALENDAR_FIELDS, "calendar definition");
  const { date, value, ...intent } = input;
  requireStringValue(date, "Calendar date field");
  const options = normalizeCalendarOptions(intent), counted = options.aggregate === "count";
  if (counted && Object.hasOwn(input, "value")) throw new TypeError("Calendar count cannot specify a value field.");
  if (!counted) requireStringValue(value, "Calendar value field");
  return cloneAndFreeze({ fields: { date, ...(!counted ? { value } : {}) }, options });
}

export function calendarSourcePoints(rows, fields) {
  if (Array.isArray(rows)) validateGeneratedItemLimit(rows.length, "Calendar source row count");
  ownArray(rows, "Calendar source rows");
  let work = 0;
  return rows.map(row => {
    ownRecord(row, "Calendar source row");
    validateWorkLimit(work += Object.keys(row).length, "Calendar source fields");
    return Object.fromEntries(Object.entries(fields).map(([role, field]) => {
      if (!Object.hasOwn(row, field)) throw new TypeError(`Calendar source requires its own ${field} field.`);
      return [role, row[field]];
    }));
  });
}
