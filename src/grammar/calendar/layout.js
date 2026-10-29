import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { aggregateScalarValues } from "../aggregate.js";
import { calendarDayDomainMetrics, deriveCalendarDayDomain } from "../calendarDay.js";
import { parseDataDateValue } from "../parseTime.js";
import { CALENDAR_BOUNDARY_WORK, calendarParts, utcTimestamp } from "../timeUnit.js";
import { stitchGridRings } from "../gridBoundary.js";
import { normalizeCalendarOptions } from "./options.js";

const ordinal = ({ year, month, day }) => utcTimestamp(year, month - 1, day) / 86_400_000;
const dateKey = ({ year, month, day }) => `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

function calendarFrame(instants, options) {
  const years = [], byYear = new Map();
  const days = instants.map(instant => {
    const parts = calendarParts(instant, options.timeZone), { year, month, day } = parts;
    if (!byYear.has(year)) {
      const start = utcTimestamp(year), end = utcTimestamp(year + 1);
      const offset = (new Date(start).getUTCDay() - options.weekStartsOn + 7) % 7;
      byYear.set(year, { anchor: start / 86_400_000 - offset, yearIndex: years.length });
      years.push({ year, yearIndex: years.length, weeks: Math.ceil(((end - start) / 86_400_000 + offset) / 7) });
    }
    const { anchor, yearIndex } = byYear.get(year), dayIndex = ordinal(parts) - anchor;
    return { key: dateKey(parts), instant, year, month, day, yearIndex, week: Math.floor(dayIndex / 7), weekday: dayIndex % 7 };
  });
  return { years, days };
}

function monthBoundaries(cells) {
  const months = new Map();
  for (const cell of cells) {
    const key = cell.key.slice(0, 7);
    if (!months.has(key)) months.set(key, { key, year: cell.year, month: cell.month, yearIndex: cell.yearIndex, cells: [], segments: [] });
    const month = months.get(key), { week: x, weekday: y } = cell;
    month.cells.push(cell.key);
    const points = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([x, y]) => ({ id: `${x},${y}`, x, y }));
    for (let index = 0; index < 4; index++) month.segments.push([points[index], points[(index + 1) % 4]]);
  }
  return [...months.values()].map(({ segments, ...month }) => {
    const polygons = stitchGridRings(segments, { origin: [0, 0], dx: 1, dy: 1 });
    const points = polygons.flatMap(polygon => polygon.outer);
    return { ...month, bounds: { left: Math.min(...points.map(point => point[0])), right: Math.max(...points.map(point => point[0])),
      top: Math.min(...points.map(point => point[1])), bottom: Math.max(...points.map(point => point[1])) }, polygons };
  });
}

export function layoutCalendarDays(input, intent) {
  const options = normalizeCalendarOptions(intent);
  if (Array.isArray(input)) validateGeneratedItemLimit(input.length, "Calendar source point count");
  ownArray(input, "Calendar source points");
  const domain = { unit: "day", start: options.start, end: options.end, timeZone: options.timeZone };
  const metrics = calendarDayDomainMetrics(domain);
  validateWorkLimit(metrics.work + metrics.count * 128 + input.length * (CALENDAR_BOUNDARY_WORK + 4 + 2 * Math.ceil(Math.log2(Math.max(1, input.length)))), "Calendar layout work");
  const { years, days } = calendarFrame(deriveCalendarDayDomain(domain), options);
  const groups = new Map(days.map(day => [day.key, { values: [], sourceIndices: [] }]));
  input.forEach((point, index) => {
    ownRecord(point, "Calendar source point");
    rejectUnknownProperties(point, options.aggregate === "count" ? ["date"] : ["date", "value"], "calendar source point");
    if (options.aggregate !== "count" && !Number.isFinite(point.value)) throw new TypeError("Calendar values must be finite.");
    const instant = parseDataDateValue(point.date, { timeZone: options.timeZone, format: "iso" });
    const key = dateKey(calendarParts(instant, options.timeZone)), group = groups.get(key);
    if (!group) throw new RangeError("Calendar source date lies outside the explicit civil-day range.");
    group.values.push(options.aggregate === "count" ? 1 : point.value);
    group.sourceIndices.push(index);
  });
  const cells = [];
  for (const day of days) {
    const group = groups.get(day.key), present = group.sourceIndices.length > 0;
    if (!present && options.missing === "omit") continue;
    const value = present ? aggregateScalarValues(group.values, options.aggregate) : null;
    cells.push({ ...day, value, sourceIndices: group.sourceIndices });
  }
  return cloneAndFreeze({ algorithm: "civil-day-cells@1", options, years, cells, months: monthBoundaries(cells) });
}
