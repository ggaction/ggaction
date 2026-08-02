import assert from "node:assert/strict";
import test from "node:test";

import {
  MONTHLY_MOVING_ROWS,
  MONTHLY_MOVING_TRANSFORM,
  MONTHLY_ROWS
} from "./reference-values.js";

const EXPECTED_MEANS = Object.freeze([
  12,
  16,
  16,
  64 / 3,
  68 / 3,
  88 / 3,
  92 / 3,
  112 / 3,
  38,
  44,
  134 / 3,
  154 / 3
]);

test("anchors truncated three-row moving means to literal values", () => {
  assert.deepEqual(
    MONTHLY_MOVING_ROWS.map(row => row.movingMean),
    EXPECTED_MEANS
  );
  assert.deepEqual(MONTHLY_MOVING_TRANSFORM.operations[0].frame, {
    preceding: 2,
    following: 0
  });
  assert.deepEqual(
    MONTHLY_MOVING_ROWS.map(row => row.month),
    MONTHLY_ROWS.map(row => row.month)
  );
});
