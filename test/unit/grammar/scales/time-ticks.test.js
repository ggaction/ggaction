import assert from "node:assert/strict";
import test from "node:test";

import {
  formatTimeTick,
  formatTimeTicks,
  niceTicks,
  timeTicks
} from "../../../../src/grammar/ticks.js";

test("includes decimal endpoints despite floating-point division", () => {
  assert.deepEqual(niceTicks([0, 0.3], 5), [0, 0.1, 0.2, 0.3]);
  assert.deepEqual(niceTicks([0.3, 0], 5), [0, 0.1, 0.2, 0.3]);
});

test("keeps extreme numeric ticks finite, ordered, and inside the domain", () => {
  const domains = [
    [1e15, 1e15 + 1],
    [0, Number.MIN_VALUE],
    [-Number.MAX_VALUE, Number.MAX_VALUE]
  ];

  for (const domain of domains) {
    const values = niceTicks(domain, 5);
    assert.equal(values.length > 0, true);
    assert.equal(values.every(Number.isFinite), true);
    assert.equal(values.every(
      (value, index) => index === 0 || value > values[index - 1]
    ), true);
    assert.equal(values.every(
      value => value >= domain[0] && value <= domain[1]
    ), true);
  }

  const bounded = niceTicks([0, 1], Number.MAX_SAFE_INTEGER);
  assert.equal(bounded.length <= 10_000, true);
  assert.equal(bounded.every(Number.isFinite), true);
});

test("creates UTC calendar-aligned year ticks near the requested density", () => {
  const domain = [Date.UTC(1970, 0, 1), Date.UTC(1982, 0, 1)];
  const values = timeTicks(domain, 5);

  assert.deepEqual(
    values.map(value => new Date(value).getUTCFullYear()),
    [1970, 1972, 1974, 1976, 1978, 1980, 1982]
  );
  assert.deepEqual(values.map(value => formatTimeTick(value, domain)), [
    "1970",
    "1972",
    "1974",
    "1976",
    "1978",
    "1980",
    "1982"
  ]);
  assert.equal(Object.isFrozen(values), true);
});

test("creates month, day, and sub-day UTC labels", () => {
  const months = [Date.UTC(2020, 0, 1), Date.UTC(2020, 6, 1)];
  const days = [Date.UTC(2020, 0, 1), Date.UTC(2020, 0, 10)];
  const minutes = [Date.UTC(2020, 0, 1, 8), Date.UTC(2020, 0, 1, 8, 30)];

  assert.equal(formatTimeTick(timeTicks(months, 3)[0], months), "2020-01");
  assert.equal(formatTimeTick(timeTicks(days, 4)[0], days), "2020-01-01");
  assert.match(formatTimeTick(timeTicks(minutes, 3)[0], minutes), /^08:/);
});

test("raises automatic precision until distinct ticks have distinct labels", () => {
  const cases = [
    [Date.UTC(2024, 0, 1), Date.UTC(2024, 2, 1)],
    [Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 3)],
    [Date.UTC(2024, 1, 28), Date.UTC(2024, 2, 1)],
    [Date.UTC(2024, 0, 1, 0), Date.UTC(2024, 0, 1, 12)],
    [Date.UTC(2024, 0, 1, 0, 0), Date.UTC(2024, 0, 1, 0, 10)],
    [Date.UTC(2024, 0, 1, 0, 0, 0), Date.UTC(2024, 0, 1, 0, 0, 10)]
  ];

  for (const domain of cases) {
    const values = timeTicks(domain, 5);
    const labels = formatTimeTicks(values, domain);
    assert.equal(new Set(labels).size, new Set(values).size);
    assert.equal(Object.isFrozen(labels), true);
  }
  assert.deepEqual(
    formatTimeTicks(timeTicks(cases[0], 5), cases[0]),
    ["2024-01-04", "2024-01-18", "2024-02-01", "2024-02-15", "2024-02-29"]
  );
  assert.throws(() => formatTimeTicks([0, NaN], [0, 1]), /finite timestamps/);
});

test("supports reversed and constant time domains", () => {
  const start = Date.UTC(2020, 0, 1);
  const end = Date.UTC(2022, 0, 1);

  assert.deepEqual(timeTicks([end, start], 2), [start, Date.UTC(2021, 0, 1), end]);
  assert.deepEqual(timeTicks([start, start], 5), [start]);
});

test("creates calendar ticks without remapping years 0000 through 0099", () => {
  const domain = [
    Date.parse("0050-06-01T00:00:00Z"),
    Date.parse("0052-06-01T00:00:00Z")
  ];
  const values = timeTicks(domain, 5);

  assert.deepEqual(values.map(value => new Date(value).toISOString()), [
    "0050-07-01T00:00:00.000Z",
    "0051-01-01T00:00:00.000Z",
    "0051-07-01T00:00:00.000Z",
    "0052-01-01T00:00:00.000Z"
  ]);
  assert.deepEqual(formatTimeTicks(values, domain), [
    "0050-07",
    "0051-01",
    "0051-07",
    "0052-01"
  ]);
});

test("validates time tick domains, counts, and values", () => {
  assert.throws(() => timeTicks([0], 5), /two finite timestamps/);
  assert.throws(() => timeTicks([0, 1], 0), /positive integer/);
  assert.throws(() => formatTimeTick(NaN, [0, 1]), /finite timestamp/);
  assert.throws(
    () => timeTicks([8.64e15, 8.64e15 + 1], 5),
    /valid dates/
  );
  assert.throws(
    () => formatTimeTick(8.64e15 + 1, [0, 1]),
    /valid date/
  );
});
