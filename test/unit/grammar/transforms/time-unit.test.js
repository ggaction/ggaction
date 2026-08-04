import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveTimeUnitRows,
  floorUtcTimeUnit,
  normalizeTimeUnitTransform
} from "../../../../src/grammar/timeUnit.js";

const timestamp = Date.UTC(2024, 4, 17, 13, 45, 56, 789);

test("floors every accepted unit at an exact UTC calendar boundary", () => {
  const expected = {
    year: Date.UTC(2024, 0, 1),
    quarter: Date.UTC(2024, 3, 1),
    month: Date.UTC(2024, 4, 1),
    day: Date.UTC(2024, 4, 17),
    hour: Date.UTC(2024, 4, 17, 13),
    minute: Date.UTC(2024, 4, 17, 13, 45),
    second: Date.UTC(2024, 4, 17, 13, 45, 56)
  };

  for (const [unit, value] of Object.entries(expected)) {
    const result = floorUtcTimeUnit(timestamp, unit);
    assert.equal(result, value, unit);
    assert.equal(result <= timestamp, true, unit);
  }
  assert.equal(
    floorUtcTimeUnit(Date.UTC(2024, 0, 1), "quarter"),
    Date.UTC(2024, 0, 1)
  );
  assert.equal(
    floorUtcTimeUnit(Date.UTC(2024, 11, 31), "quarter"),
    Date.UTC(2024, 9, 1)
  );
  assert.equal(
    floorUtcTimeUnit(Date.UTC(2024, 1, 29, 23, 59), "day"),
    Date.UTC(2024, 1, 29)
  );
  assert.equal(
    new Date(floorUtcTimeUnit(Date.parse("0050-06-15T12:00:00Z"), "year"))
      .getUTCFullYear(),
    50
  );
});

test("derives frozen source-ordered rows from every accepted temporal input form", () => {
  const rows = [
    { id: "number", date: timestamp },
    { id: "iso", date: "2024-05-17T13:45:56.789Z" },
    { id: "date", date: "2024-05-17" },
    { id: "year", date: "2024" }
  ];
  const transform = normalizeTimeUnitTransform({
    field: "date",
    unit: "month",
    as: "month"
  });
  const derived = deriveTimeUnitRows(rows, transform);

  assert.deepEqual(derived, [
    { id: "number", date: timestamp, month: Date.UTC(2024, 4, 1) },
    { id: "iso", date: "2024-05-17T13:45:56.789Z", month: Date.UTC(2024, 4, 1) },
    { id: "date", date: "2024-05-17", month: Date.UTC(2024, 4, 1) },
    { id: "year", date: "2024", month: Date.UTC(2024, 0, 1) }
  ]);
  assert.equal(Object.isFrozen(derived), true);
  assert.equal(derived.every(Object.isFrozen), true);
  assert.equal(Object.hasOwn(rows[0], "month"), false);
});

test("validates the closed transform and source-field contracts", () => {
  assert.throws(
    () => normalizeTimeUnitTransform({ field: "date", unit: "week", as: "bucket" }),
    /Unsupported time unit/
  );
  assert.throws(
    () => normalizeTimeUnitTransform({ field: "date", unit: "month", as: "date" }),
    /must be distinct/
  );
  assert.throws(
    () => deriveTimeUnitRows([{}], {
      type: "timeUnit", field: "date", unit: "month", as: "month"
    }),
    /does not contain field "date" at row 0/
  );
  assert.throws(
    () => deriveTimeUnitRows([{ date: "2024-01-01", month: 1 }], {
      type: "timeUnit", field: "date", unit: "month", as: "month"
    }),
    /output field "month" already exists/
  );
  assert.throws(
    () => deriveTimeUnitRows([{ date: "not-a-date" }], {
      type: "timeUnit", field: "date", unit: "month", as: "month"
    }),
    /must contain a temporal string or finite timestamp/
  );
  assert.throws(
    () => floorUtcTimeUnit(Number.NaN, "month"),
    /timestamp must be finite/
  );
  assert.throws(
    () => floorUtcTimeUnit(Number.MAX_VALUE, "month"),
    /must represent a valid date/
  );
});
