import assert from "node:assert/strict";
import test from "node:test";

import {
  stableOrderPathValues,
  validatePathOrderDirection
} from "../../../src/grammar/pathOrder.js";

test("orders ascending and descending values with stable ties", () => {
  const values = ["late", "first tie", "early", "second tie"];
  const order = [3, 2, 1, 2];

  assert.deepEqual(
    stableOrderPathValues(values, order),
    ["early", "first tie", "second tie", "late"]
  );
  assert.deepEqual(
    stableOrderPathValues(values, order, "descending"),
    ["late", "first tie", "second tie", "early"]
  );
  assert.equal(Object.isFrozen(stableOrderPathValues(values, order)), true);
  assert.deepEqual(values, ["late", "first tie", "early", "second tie"]);
});

test("rejects invalid directions, values, and unequal inputs", () => {
  assert.equal(validatePathOrderDirection("ascending"), "ascending");
  assert.throws(
    () => validatePathOrderDirection("forward"),
    /Unsupported path order/
  );
  assert.throws(
    () => stableOrderPathValues(["a"], [Number.NaN]),
    /finite numbers/
  );
  assert.throws(
    () => stableOrderPathValues(["a"], []),
    /equal length/
  );
});
