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
