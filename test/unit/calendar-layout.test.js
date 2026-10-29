import assert from "node:assert/strict";
import test from "node:test";
import { layoutCalendarDays } from "../../src/grammar/calendar/layout.js";
import { normalizeCalendarOptions } from "../../src/grammar/calendar/options.js";
import { civilCell, civilOrdinal, leapYear, monthLength, cellPerimeter, polygonPerimeter } from "../oracles/calendar.js";
import { contourArea, locateContourPoint } from "../oracles/contour.js";

const options = patch => ({ start: "2024-01-01", end: "2024-12-31", timeZone: "UTC", weekStartsOn: 1, aggregate: "count", missing: "empty", ...patch });
const layout = (points = [], patch) => layoutCalendarDays(points, options(patch));

test("Gregorian oracle anchors leap centuries, known weekdays and year boundaries", () => {
  assert.equal(leapYear(1900), false); assert.equal(leapYear(2000), true);
  assert.equal(monthLength(2024, 2), 29);
  assert.equal(civilOrdinal(2025, 1, 1) - civilOrdinal(2024, 1, 1), 366);
  assert.deepEqual(civilCell(2024, 1, 1, 1), { week: 0, weekday: 0 });
  assert.deepEqual(civilCell(2024, 1, 7, 0), { week: 1, weekday: 0 });
  assert.deepEqual(civilCell(2012, 12, 31, 1), { week: 53, weekday: 0 });
});

test("all week starts place leap-year cells against independent Gregorian arithmetic", () => {
  for (let weekStartsOn = 0; weekStartsOn < 7; weekStartsOn++) {
    const result = layout([], { weekStartsOn });
    assert.equal(result.cells.length, 366);
    assert.equal(result.months[1].cells.length, 29);
    assert.equal(result.months.length, 12);
    assert.equal(new Set(result.cells.map(cell => cell.key)).size, 366);
    for (const cell of result.cells) {
      assert.deepEqual({ week: cell.week, weekday: cell.weekday }, civilCell(cell.year, cell.month, cell.day, weekStartsOn));
      assert.equal(cell.value, null); assert.deepEqual(cell.sourceIndices, []);
    }
    assert.equal(result.cells[0].key, "2024-01-01");
    assert.equal(result.cells.at(-1).key, "2024-12-31");
  }
});

test("month polygons exactly cover emitted cells with independent area and perimeter", () => {
  const result = layout();
  for (const month of result.months) {
    const cells = result.cells.filter(cell => cell.month === month.month);
    assert.equal(contourArea(month.polygons), monthLength(2024, month.month));
    assert.equal(polygonPerimeter(month.polygons), cellPerimeter(cells));
    const occupied = new Set(cells.map(cell => `${cell.week},${cell.weekday}`));
    for (let x = month.bounds.left - 1; x <= month.bounds.right; x++) for (let y = -1; y <= 7; y++) {
      assert.equal(locateContourPoint(month.polygons, [x + .5, y + .5]), occupied.has(`${x},${y}`));
    }
    for (const polygon of month.polygons) for (const ring of [polygon.outer, ...polygon.holes]) assert.deepEqual(ring[0], ring.at(-1));
  }
});

test("explicit omission preserves separate islands and a missing-day hole", () => {
  const dates = [1, 10, 11, 12, 17, 19, 24, 25, 26].map(day => `2024-01-${String(day).padStart(2, "0")}`);
  const result = layout(dates.map(date => ({ date })), { end: "2024-01-31", missing: "omit" });
  const month = result.months[0];
  assert.equal(result.cells.length, 9); assert.equal(month.polygons.length, 2);
  assert.equal(month.polygons.reduce((sum, polygon) => sum + polygon.holes.length, 0), 1);
  assert.equal(contourArea(month.polygons), 9);
  assert.equal(polygonPerimeter(month.polygons), cellPerimeter(result.cells));
  assert.equal(locateContourPoint(month.polygons, [2.5, 3.5]), false);
  assert.deepEqual(month.cells, dates);
});

test("partial multi-year ranges keep calendar ordering and 54-week frames", () => {
  const result = layout([], { start: "2012-12-30", end: "2013-01-02" });
  assert.deepEqual(result.years, [{ year: 2012, yearIndex: 0, weeks: 54 }, { year: 2013, yearIndex: 1, weeks: 53 }]);
  assert.deepEqual(result.cells.map(cell => [cell.key, cell.yearIndex, cell.week, cell.weekday]), [
    ["2012-12-30", 0, 52, 6], ["2012-12-31", 0, 53, 0], ["2013-01-01", 1, 0, 1], ["2013-01-02", 1, 0, 2]
  ]);
  assert.deepEqual(result.months.map(month => month.key), ["2012-12", "2013-01"]);
  const zero = layout([], { start: "0000-01-01", end: "0000-01-01" });
  assert.equal(zero.cells[0].key, "0000-01-01");
  assert.deepEqual([zero.cells[0].week, zero.cells[0].weekday], [0, 5]);
});

test("empty and zero-valued inputs retain their distinct explicit completion semantics", () => {
  const absent = layout([], { start: "2024-02-01", end: "2024-02-29", missing: "omit" });
  assert.deepEqual(absent.cells, []); assert.deepEqual(absent.months, []);
  assert.deepEqual(absent.years, [{ year: 2024, yearIndex: 0, weeks: 53 }]);
  const present = layout([{ date: "2024-02-01", value: 0 }], { start: "2024-02-01", end: "2024-02-02", aggregate: "sum" });
  assert.deepEqual(present.cells.map(cell => [cell.value, cell.sourceIndices]), [[0, [0]], [null, []]]);
});

test("duplicate civil dates use the explicit shared aggregate and preserve exact contributions", () => {
  for (const [aggregate, expected] of [["sum", 4], ["mean", 4 / 3], ["median", 1], ["min", -2], ["max", 5]]) {
    const points = [{ date: "2024-02-29T23:00:00Z", value: 5 }, { date: "2024-02-29", value: -2 }, { date: Date.parse("2024-02-29T12:00:00Z"), value: 1 }];
    const result = layout(points, { aggregate, missing: "omit" });
    assert.equal(result.cells[0].value, expected); assert.deepEqual(result.cells[0].sourceIndices, [0, 1, 2]);
    assert.equal(layout([...points].reverse(), { aggregate, missing: "omit" }).cells[0].value, expected);
  }
  assert.equal(layout([{ date: "2024-02-29" }, { date: "2024-02-29" }], { missing: "omit" }).cells[0].value, 2);
  assert.throws(() => layout([{ date: "2024-01-01", value: Number.MAX_VALUE }, { date: "2024-01-01", value: Number.MAX_VALUE }], { aggregate: "sum" }), /finite/);
});

test("spring and fall transitions group instants by civil day without adding 24-hour durations", () => {
  const spring = layout([{ date: "2024-03-10T01:30:00-05:00" }, { date: "2024-03-10T03:30:00-04:00" }],
    { start: "2024-03-09", end: "2024-03-11", timeZone: "America/New_York" });
  assert.deepEqual(spring.cells.map(cell => cell.value), [null, 2, null]);
  assert.deepEqual(spring.cells.map(cell => cell.instant), [Date.parse("2024-03-09T05:00:00Z"), Date.parse("2024-03-10T05:00:00Z"), Date.parse("2024-03-11T04:00:00Z")]);
  assert.equal(spring.cells[2].instant - spring.cells[1].instant, 23 * 3_600_000);
  const fall = layout([{ date: "2024-11-03T01:30:00-04:00" }, { date: "2024-11-03T01:30:00-05:00" }],
    { start: "2024-11-02", end: "2024-11-04", timeZone: "America/New_York" });
  assert.deepEqual(fall.cells.map(cell => cell.value), [null, 2, null]);
  assert.equal(fall.cells[2].instant - fall.cells[1].instant, 25 * 3_600_000);
  const projected = layout([{ date: "2024-01-01T00:00:00Z" }], { start: "2023-12-31", end: "2024-01-01", timeZone: "America/New_York", missing: "omit" });
  assert.equal(projected.cells[0].key, "2023-12-31");
});

test("invalid dates, nonexistent local time and skipped civil boundaries fail closed", () => {
  for (const date of ["2023-02-29", "2024-02-30", "2024-01-01junk", "2024-01-01T25:00:00Z", "2025-01-01", Infinity, null, undefined, new Date()]) {
    assert.throws(() => layout([{ date }]));
  }
  assert.throws(() => layout([{ date: "2024-03-10T02:30:00" }], { timeZone: "America/New_York" }), /does not exist/);
  assert.throws(() => layout([], { start: "2011-12-29", end: "2011-12-31", timeZone: "Pacific/Apia" }), /does not exist|roundtrip/);
});

test("calendar normalization rejects ambiguous policy, malformed source and excess work before mutation", () => {
  for (const patch of [{ weekStartsOn: -1 }, { weekStartsOn: 7 }, { weekStartsOn: .5 }, { weekStartsOn: undefined },
    { missing: "zero" }, { aggregate: "first" }, { timeZone: "bad-zone" }, { timeZone: "+02:00" },
    { start: "2024-2-01" }, { start: "2024-02-30" }, { end: "2023-01-01" }, { extra: true }]) {
    assert.throws(() => normalizeCalendarOptions(options(patch)));
  }
  for (const points of [[{}], [null], [{ date: "2024-01-01", value: 1 }], [{ date: "2024-01-01", extra: true }], [,], {}]) assert.throws(() => layout(points));
  for (const value of [null, undefined, NaN, Infinity, "1"]) assert.throws(() => layout([{ date: "2024-01-01", value }], { aggregate: "sum" }));
  assert.throws(() => layout(new Array(10_001)), /limit|10000/i);
  assert.throws(() => layout([], { start: "0000-01-01", end: "9999-12-31" }), /limit|10000/i);
  let invoked = false;
  const point = {}; Object.defineProperty(point, "date", { enumerable: true, get() { invoked = true; return "2024-01-01"; } });
  assert.throws(() => layout([point]), /accessors/); assert.equal(invoked, false);
  const unsafe = options(); Object.defineProperty(unsafe, "aggregate", { enumerable: true, get() { invoked = true; return "sum"; } });
  assert.throws(() => layoutCalendarDays([], unsafe), /accessors/); assert.equal(invoked, false);
});

test("calendar results isolate caller data and freeze every shared cell and boundary", () => {
  const points = [{ date: "2024-01-02", value: 4 }, { date: "2024-01-01", value: 2 }], intent = options({ aggregate: "sum", missing: "omit" });
  const snapshot = structuredClone({ points, intent }), result = layoutCalendarDays(points, intent);
  assert.deepEqual({ points, intent }, snapshot);
  assert.deepEqual(result.cells.map(cell => [cell.key, cell.sourceIndices]), [["2024-01-01", [1]], ["2024-01-02", [0]]]);
  points[0].value = 99; intent.missing = "empty";
  assert.equal(result.cells[1].value, 4); assert.equal(result.options.missing, "omit");
  assert.throws(() => result.cells[0].sourceIndices.push(9), TypeError);
  assert.throws(() => { result.months[0].polygons[0].outer[0][0] = 99; }, TypeError);
});
