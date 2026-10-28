import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram } from "../../../../src/persistence.js";
import { getErrorDetails } from "../../../../src/diagnostics.js";
import { deriveCompleteRows, normalizeCompleteTransform } from "../../../../src/grammar/complete.js";
import { civilDayBoundaries, gregorianDays } from "../../../oracles/calendar-days.js";

const calendar = patch => ({ unit: "day", start: "2024-01-01", end: "2024-12-31", timeZone: "UTC", ...patch });
const data = (p, id) => p.semanticSpec.datasets.find(d => d.id === id);
const empty = () => chart().createData({ id: "raw", values: [], schema: { fields: [
  { name: "day", storageType: "number" }, { name: "group", storageType: "string" }
] } });
const transform = patch => normalizeCompleteTransform({ key: "day", calendar: calendar(), ...patch });

test("public day completion includes all leap-year dates with explicit missing values and no input contribution", () => {
  const source = empty(), before = serializeProgram(source), options = calendar();
  const p = source.createCompleteData({ id: "days", key: "day", calendar: options, fill: { total: null }, members: "members" });
  const days = data(p, "days");
  assert.equal(days.values.length, 366);
  assert.deepEqual(days.values.map(row => new Date(row.day).toISOString().slice(0, 10)), gregorianDays(options.start, options.end));
  assert.equal(days.values[59].day, 1709164800000);
  assert.ok(days.values.every(row => row.total === null && row.members.length === 0));
  assert.equal(new Set(days.rowKeys).size, 366);
  assert.ok(days.lineage.rowRefs.every(index => days.lineage.entries[index].length === 0));
  assert.deepEqual(days.transform, [{ type: "complete", key: "day", groupBy: [], fill: { total: null }, calendar: options, members: "members" }]);
  options.start = "2023-01-01";
  assert.equal(days.transform[0].calendar.start, "2024-01-01");
  assert.equal(days.transform[0].values, undefined);
  assert.equal(serializeProgram(source), before);
  assert.deepEqual(p.trace.children.at(-1).children.map(node => node.op), ["createDerivedData", "materializeCompleteData"]);
});

test("public calendar completion reuses literal DST boundaries rather than fixed day milliseconds", () => {
  for (const { expected, ...options } of civilDayBoundaries) {
    const rows = data(empty().createCompleteData({ id: "days", key: "day", calendar: calendar(options) }), "days").values;
    assert.deepEqual(rows.map(row => new Date(row.day).toISOString()), expected);
  }
  const spring = civilDayBoundaries[0], fall = civilDayBoundaries[1];
  assert.equal(Date.parse(spring.expected[2]) - Date.parse(spring.expected[1]), 23 * 3600000);
  assert.equal(Date.parse(fall.expected[2]) - Date.parse(fall.expected[1]), 25 * 3600000);
});

test("completion keeps duplicate observations, group order, zero and null distinct", () => {
  const day = 1704067200000;
  const rows = [{ day, group: "B", total: 0 }, { day, group: "A", total: 2 }, { day, group: "A", total: 3 }];
  const snapshot = structuredClone(rows), definition = transform({ groupBy: "group", members: "members", calendar: calendar({ end: "2024-01-02" }) });
  const output = deriveCompleteRows(rows, definition);
  assert.deepEqual(output, [
    { day, group: "B", total: 0, members: [0] }, { day: day + 86400000, group: "B", total: null, members: [] },
    { day, group: "A", total: 2, members: [1] }, { day, group: "A", total: 3, members: [2] },
    { day: day + 86400000, group: "A", total: null, members: [] }
  ]);
  assert.deepEqual(rows, snapshot);
  assert.ok(Object.isFrozen(output) && output.every(Object.isFrozen));
});

test("empty grouped calendars retain numeric key, nullable fill and member schema without inventing groups", () => {
  const p = empty().createCompleteData({ id: "days", key: "day", groupBy: "group", calendar: calendar(), fill: { total: null, count: 0 }, members: "members" });
  assert.deepEqual(data(p, "days").values, []);
  const fields = new Map(data(p, "days").schema.fields.map(field => [field.name, field]));
  assert.equal(fields.get("day").storageType, "number");
  assert.equal(fields.get("total").nullable, true);
  assert.equal(fields.get("count").storageType, "number");
  assert.equal(fields.get("members").storageType, "array");
  assert.throws(() => chart().createData({ values: [] }).createCompleteData({ id: "days", key: "day", calendar: calendar() }), /does not contain field/);
});

test("calendar calls reject unaligned keys, invalid dates, zones and conflicting modes atomically", () => {
  const p = empty(), before = serializeProgram(p);
  for (const patch of [
    { unit: "month" }, { start: "2024-2-01" }, { start: "2023-02-29" }, { end: "2023-12-31" },
    { timeZone: "Bad/Zone" }, { timeZone: undefined }, { timeZone: "+01:00" },
    { start: "2011-12-29", end: "2011-12-31", timeZone: "Pacific/Apia" }
  ]) {
    assert.throws(() => p.createCompleteData({ id: "bad", key: "day", calendar: calendar(patch) }), /unit|date|Gregorian|after|zone|timeZone|boundary/i);
    assert.equal(serializeProgram(p), before);
  }
  for (const extra of [{ values: [1704067200000] }, { sequence: { start: 0, end: 1, step: 1 } }]) {
    assert.throws(() => p.createCompleteData({ id: "bad", key: "day", calendar: calendar(), ...extra }), /mutually exclusive/);
  }
  for (const day of [1704110400000, "2024-01-01", null, 1704067200000 - 1]) {
    assert.throws(() => deriveCompleteRows([{ day }], transform()), /outside the requested domain/);
  }
  assert.throws(() => deriveCompleteRows([{ day: NaN }], transform()), /JSON-safe scalar/);
  assert.throws(() => deriveCompleteRows([{ day: 1704067200000 }], transform({ calendar: calendar({ timeZone: "Asia/Seoul" }) })), /outside the requested domain/);
});

test("calendar completion rejects invalid grouping and source shape without repairing rows", () => {
  for (const groupBy of [42, ["g", "g"], ["day"]]) {
    assert.throws(() => transform({ groupBy }), /groupBy|unique|distinct/);
  }
  for (const rows of [null, {}, [null], [1], [[]], [new Date()]]) {
    assert.throws(() => deriveCompleteRows(rows, transform()), /array|plain object/);
  }
  assert.throws(() => deriveCompleteRows([{}], transform()), /does not contain field/);
  assert.throws(() => deriveCompleteRows([{ day: 1704067200000, g: 1 }, { day: 1704067200000, g: "1" }], transform({ groupBy: "g" })), /one scalar type/);
  assert.throws(() => deriveCompleteRows([{ day: 1704067200000, g: {} }], transform({ groupBy: "g" })), /JSON-safe scalar/);
});

test("calendar completion bounds days, groups, duplicates and cumulative cell work before expansion", () => {
  const tenThousand = calendar({ start: "2000-01-01", end: "2027-05-18" });
  assert.equal(deriveCompleteRows([], transform({ calendar: tenThousand })).length, 10000);
  assert.throws(() => deriveCompleteRows([], transform({ calendar: { ...tenThousand, end: "2027-05-19" } })), /10000/);
  assert.throws(() => deriveCompleteRows([{ day: 946684800000, g: "A" }, { day: 946684800000, g: "B" }], transform({ calendar: tenThousand, groupBy: "g" })), /10000/);
  const duplicates = Array.from({ length: 10000 }, () => ({ day: 1704067200000 }));
  assert.equal(deriveCompleteRows(duplicates, transform({ calendar: calendar({ end: "2024-01-01" }) })).length, 10000);
  assert.throws(() => deriveCompleteRows(duplicates, transform({ calendar: calendar({ end: "2024-01-02" }) })), /10000/);
  assert.throws(() => deriveCompleteRows([...duplicates, duplicates[0]], transform()), /10000/);
  const wide = { day: 946684800000, ...Object.fromEntries(Array.from({ length: 500 }, (_, index) => [`v${index}`, index])) };
  assert.throws(() => deriveCompleteRows([wide], transform({ calendar: tenThousand })), error => getErrorDetails(error).code === "resource-limit" && /Calendar completion work/.test(error.message));
  let reads = 0;
  const getter = { get day() { reads++; return 1704067200000; } };
  assert.throws(() => deriveCompleteRows([getter], transform()), /data properties/);
  const sparse = new Array(1);
  assert.throws(() => deriveCompleteRows(sparse, transform()), /dense/);
  assert.equal(reads, 0);
});
