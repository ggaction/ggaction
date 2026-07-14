import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateRows,
  aggregateScalarValues,
  formatAggregateTitle,
  SCALAR_AGGREGATE_OPERATIONS,
  validateAggregate,
  validateAggregateFieldType,
  validateAggregateFieldValues,
  validateScalarAggregateFieldType
} from "../../../../src/grammar/aggregate.js";

test("computes the complete scalar aggregate vocabulary", () => {
  const values = [1, 2, 3, 4];
  const expected = {
    count: 4,
    sum: 10,
    mean: 2.5,
    median: 2.5,
    min: 1,
    max: 4,
    distinct: 4,
    valid: 4,
    missing: 0,
    variance: 5 / 3,
    varianceP: 1.25,
    stdev: Math.sqrt(5 / 3),
    stdevP: Math.sqrt(1.25),
    stderr: Math.sqrt(5 / 3) / 2,
    q1: 1.75,
    q3: 3.25,
    ciLower: 2.5 - 1.96 * Math.sqrt(5 / 3) / 2,
    ciUpper: 2.5 + 1.96 * Math.sqrt(5 / 3) / 2
  };

  assert.deepEqual([...SCALAR_AGGREGATE_OPERATIONS].sort(), Object.keys(expected).sort());
  for (const [operation, value] of Object.entries(expected)) {
    assert.equal(aggregateScalarValues(values, operation), value, operation);
  }
});

test("applies missing, distinct, and finite quantitative policies", () => {
  const values = [1, 1, null, undefined, NaN, Infinity, "1", false];

  assert.equal(aggregateScalarValues(values, "count"), 8);
  assert.equal(aggregateScalarValues(values, "valid"), 5);
  assert.equal(aggregateScalarValues(values, "missing"), 3);
  assert.equal(aggregateScalarValues(values, "distinct"), 4);
  assert.equal(aggregateScalarValues(values, "sum"), 2);
  assert.equal(aggregateScalarValues(values, "mean"), 1);
});

test("omits operations without their required valid sample", () => {
  const missing = [null, undefined, NaN, Infinity, "bad"];

  for (const operation of [
    "sum", "mean", "median", "min", "max", "variance", "varianceP",
    "stdev", "stdevP", "stderr", "q1", "q3", "ciLower", "ciUpper"
  ]) {
    assert.equal(aggregateScalarValues(missing, operation), undefined, operation);
  }
  for (const operation of ["variance", "stdev", "stderr", "ciLower", "ciUpper"]) {
    assert.equal(aggregateScalarValues([4], operation), undefined, operation);
  }
  assert.equal(aggregateScalarValues([4], "varianceP"), 0);
  assert.equal(aggregateScalarValues([4], "stdevP"), 0);
});

test("validates scalar field compatibility and parameter aggregate schemas", () => {
  for (const operation of ["count", "distinct", "valid", "missing"]) {
    assert.equal(validateScalarAggregateFieldType(operation, "nominal"), "nominal");
  }
  assert.equal(validateScalarAggregateFieldType("median", "quantitative"), "quantitative");
  assert.throws(
    () => validateScalarAggregateFieldType("median", "nominal"),
    /does not support field type/
  );
  assert.throws(
    () => validateScalarAggregateFieldType("mean", "temporal"),
    /does not support field type/
  );
  assert.deepEqual(
    validateAggregate({ op: "quantile", probability: 0.75 }),
    { op: "quantile", probability: 0.75 }
  );
  assert.deepEqual(
    validateAggregate({ op: "first", orderBy: "rank" }),
    { op: "first", orderBy: "rank", order: "ascending" }
  );
  assert.throws(() => validateAggregate("mode"), /Unsupported aggregate/);
  assert.throws(() => aggregateScalarValues({}, "mean"), /must be an array/);
  assert.doesNotThrow(() => validateAggregateFieldValues(
    [{ value: 1 }, { value: null }, { value: NaN }],
    "value",
    "quantitative"
  ));
  assert.doesNotThrow(() => validateAggregateFieldValues(
    [{ value: "A" }, { value: false }, { value: 2 }, {}],
    "value",
    "nominal"
  ));
  assert.throws(
    () => validateAggregateFieldValues([{ value: "1" }], "value", "quantitative"),
    /numeric or missing/
  );
  assert.throws(
    () => validateAggregateFieldValues([{ value: {} }], "value", "nominal"),
    /nominal or missing/
  );
});

test("computes parameterized quantiles at inclusive boundaries", () => {
  const rows = [{ value: 10 }, { value: 0 }, { value: 30 }, { value: 20 }];

  assert.equal(
    aggregateRows(rows, "value", { op: "quantile", probability: 0 }),
    0
  );
  assert.equal(
    aggregateRows(rows, "value", { op: "quantile", probability: 0.25 }),
    7.5
  );
  assert.equal(
    aggregateRows(rows, "value", { op: "quantile", probability: 1 }),
    30
  );
  assert.equal(
    aggregateRows([{ value: null }, { value: Infinity }], "value", {
      op: "quantile",
      probability: 0.5
    }),
    undefined
  );
});

test("selects ordered values with stable source-order ties", () => {
  const rows = [
    { value: 10, rank: 2 },
    { value: 20, rank: 1 },
    { value: 30, rank: 1 },
    { value: 40, rank: null },
    { value: Infinity, rank: 0 }
  ];

  assert.equal(
    aggregateRows(rows, "value", { op: "first", orderBy: "rank" }),
    20
  );
  assert.equal(
    aggregateRows(rows, "value", { op: "last", orderBy: "rank" }),
    10
  );
  assert.equal(
    aggregateRows(rows, "value", {
      op: "first",
      orderBy: "rank",
      order: "descending"
    }),
    10
  );
  assert.equal(
    aggregateRows(rows, "value", {
      op: "last",
      orderBy: "rank",
      order: "descending"
    }),
    30
  );
  assert.equal(
    aggregateRows([
      { value: 1, rank: "B" },
      { value: 2, rank: "A" }
    ], "value", { op: "first", orderBy: "rank" }),
    2
  );
  assert.equal(
    aggregateRows([
      { value: 1, rank: false },
      { value: 2, rank: true }
    ], "value", { op: "last", orderBy: "rank" }),
    2
  );
  assert.equal(
    aggregateRows([{ value: 1, rank: null }], "value", {
      op: "first",
      orderBy: "rank"
    }),
    undefined
  );
  assert.equal(
    aggregateRows([
      { value: 1, rank: 1 },
      { value: 2, rank: "2" }
    ], "value", { op: "first", orderBy: "rank" }),
    undefined
  );
});

test("validates and formats parameterized aggregate contracts", () => {
  assert.equal(
    validateAggregateFieldType(
      { op: "quantile", probability: 0.5 },
      "quantitative"
    ),
    "quantitative"
  );
  assert.throws(
    () => validateAggregateFieldType(
      { op: "first", orderBy: "rank" },
      "nominal"
    ),
    /does not support field type/
  );
  assert.equal(
    formatAggregateTitle({ op: "quantile", probability: 0.75 }, "value"),
    "quantile(value, 0.75)"
  );
  assert.equal(
    formatAggregateTitle({ op: "last", orderBy: "rank" }, "value"),
    "last(value, rank ascending)"
  );

  for (const probability of [-0.01, 1.01, NaN, Infinity, undefined]) {
    assert.throws(
      () => validateAggregate({ op: "quantile", probability }),
      /between 0 and 1/
    );
  }
  assert.throws(
    () => validateAggregate({ op: "quantile", probability: 0.5, extra: true }),
    /Unknown quantile aggregate property/
  );
  assert.throws(
    () => validateAggregate({ op: "first", orderBy: "" }),
    /non-empty string/
  );
  assert.throws(
    () => validateAggregate({ op: "last", orderBy: "rank", order: "sideways" }),
    /Unsupported ordered aggregate order/
  );
});
