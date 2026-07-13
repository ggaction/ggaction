import assert from "node:assert/strict";
import test from "node:test";

import {
  noOptions,
  sameOrderedValues,
  validateKeys
} from "../../../src/core/validation.js";

test("validates closed option keys", () => {
  assert.doesNotThrow(() => validateKeys({ width: 10 }, ["width"], "example"));
  assert.throws(
    () => validateKeys({ typo: true }, ["width"], "example"),
    /Unknown example option "typo"/
  );
});

test("requires an empty plain option object", () => {
  assert.doesNotThrow(() => noOptions({}, "operation"));
  assert.throws(() => noOptions({ value: 1 }, "operation"), /does not accept/);
  assert.throws(() => noOptions([], "operation"), /does not accept/);
});

test("compares ordered values without coercion", () => {
  assert.equal(sameOrderedValues(["A", 2], ["A", 2]), true);
  assert.equal(sameOrderedValues(["A", 2], [2, "A"]), false);
  assert.equal(sameOrderedValues(undefined, undefined), false);
});
