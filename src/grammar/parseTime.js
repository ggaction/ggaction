import { normalizeTemporalValue } from "./scales/fields.js";

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
