import assert from "node:assert/strict";
import test from "node:test";

import {
  BOX_FIELDS,
  deriveBoxData,
  normalizeBoxTransform,
  validateBoxTransform
} from "../../../../src/grammar/boxPlot.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", value: 1, row: 0 }),
  Object.freeze({ group: "A", value: 2, row: 1 }),
  Object.freeze({ group: "A", value: 3, row: 2 }),
  Object.freeze({ group: "A", value: 4, row: 3 }),
  Object.freeze({ group: "A", value: 100, row: 4 }),
  Object.freeze({ group: "B", value: 5, row: 5 }),
  Object.freeze({ group: "B", value: null, row: 6 }),
  Object.freeze({ group: null, value: 7, row: 7 })
]);

test("derives linear quartiles, observed Tukey whiskers, and source-order outliers", () => {
  const transform = normalizeBoxTransform({
    category: "group",
    field: "value"
  });
  const result = deriveBoxData(rows, transform);

  assert.deepEqual(result.summaries, [
    {
      group: "A",
      [BOX_FIELDS.q1]: 2,
      [BOX_FIELDS.median]: 3,
      [BOX_FIELDS.q3]: 4,
      [BOX_FIELDS.lowerWhisker]: 1,
      [BOX_FIELDS.upperWhisker]: 4,
      [BOX_FIELDS.lowerFence]: -1,
      [BOX_FIELDS.upperFence]: 7,
      [BOX_FIELDS.count]: 5
    },
    {
      group: "B",
      [BOX_FIELDS.q1]: 5,
      [BOX_FIELDS.median]: 5,
      [BOX_FIELDS.q3]: 5,
      [BOX_FIELDS.lowerWhisker]: 5,
      [BOX_FIELDS.upperWhisker]: 5,
      [BOX_FIELDS.lowerFence]: 5,
      [BOX_FIELDS.upperFence]: 5,
      [BOX_FIELDS.count]: 1
    }
  ]);
  assert.deepEqual(result.outliers, [{ group: "A", value: 100, row: 4 }]);
  assert.notEqual(result.outliers[0], rows[4]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.outliers[0]), true);
});

test("keeps first category appearance and owns caller-provided output names", () => {
  const as = Object.fromEntries(
    Object.keys(BOX_FIELDS).map(key => [key, `box_${key}`])
  );
  const transform = normalizeBoxTransform({
    type: "boxOutlier",
    category: "group",
    field: "value",
    factor: 1,
    as
  });
  as.q1 = "changed";

  assert.equal(transform.as.q1, "box_q1");
  assert.deepEqual(
    deriveBoxData([...rows].reverse(), transform).summaries.map(row => row.group),
    ["B", "A"]
  );
});

test("derives observed minmax whiskers without outlier rows", () => {
  const transform = normalizeBoxTransform({
    category: "group",
    field: "value",
    whisker: "minmax"
  });
  const result = deriveBoxData(rows, transform);

  assert.equal(transform.whisker, "minmax");
  assert.equal(Object.hasOwn(transform, "factor"), false);
  assert.deepEqual(
    result.summaries.map(row => ({
      group: row.group,
      lower: row[BOX_FIELDS.lowerWhisker],
      upper: row[BOX_FIELDS.upperWhisker],
      lowerFence: row[BOX_FIELDS.lowerFence],
      upperFence: row[BOX_FIELDS.upperFence]
    })),
    [
      { group: "A", lower: 1, upper: 100, lowerFence: 1, upperFence: 100 },
      { group: "B", lower: 5, upper: 5, lowerFence: 5, upperFence: 5 }
    ]
  );
  assert.deepEqual(result.outliers, []);
});

test("validates box transform provenance and finite measures", () => {
  const valid = normalizeBoxTransform({ category: "group", field: "value" });
  assert.equal(validateBoxTransform(valid), valid);
  assert.throws(() => deriveBoxData("rows", valid), /rows must be an array/);
  assert.throws(
    () => deriveBoxData([{ group: "A", value: Infinity }], valid),
    /finite numbers/
  );
  assert.throws(
    () => deriveBoxData([{ group: null, value: 1 }], valid),
    /at least one valid row/
  );
  assert.throws(
    () => normalizeBoxTransform({ category: "group", field: "value", factor: 0 }),
    /positive and finite/
  );
  assert.throws(
    () => normalizeBoxTransform({
      category: "group",
      field: "value",
      whisker: "minmax",
      factor: 1
    }),
    /do not accept factor/
  );
  assert.throws(
    () => normalizeBoxTransform({
      category: "group",
      field: "value",
      whisker: "outer"
    }),
    /Unsupported box whisker policy/
  );
  assert.throws(
    () => validateBoxTransform({ ...valid, method: "nearest" }),
    /Unsupported box quantile method/
  );
  assert.throws(
    () => normalizeBoxTransform({
      category: "group",
      field: "value",
      as: { ...BOX_FIELDS, q1: "value" }
    }),
    /must not collide/
  );
});

test("derives finite linear quartiles across the complete numeric range", () => {
  const extremeRows = [
    { group: "A", value: -1e308 },
    { group: "A", value: 1e308 }
  ];
  const result = deriveBoxData(extremeRows, normalizeBoxTransform({
    category: "group",
    field: "value",
    whisker: "minmax"
  }));
  const summary = result.summaries[0];
  assert.deepEqual([
    summary[BOX_FIELDS.q1],
    summary[BOX_FIELDS.median],
    summary[BOX_FIELDS.q3]
  ], [-5e307, 0, 5e307]);
  assert.equal(Object.values(summary).filter(value => typeof value === "number")
    .every(Number.isFinite), true);
  assert.throws(() => deriveBoxData(
    extremeRows,
    normalizeBoxTransform({ category: "group", field: "value" })
  ), /Tukey fences are outside the finite numeric range/);
});
