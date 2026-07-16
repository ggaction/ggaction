import assert from "node:assert/strict";
import test from "node:test";

import {
  noOptions,
  sameOrderedValues,
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite,
  validateUnitInterval
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

test("validates shared appearance scalar contracts", () => {
  assert.equal(validateNonEmptyString("red", "Color"), "red");
  assert.equal(validateUnitInterval(0, "Opacity"), 0);
  assert.equal(validateUnitInterval(1, "Opacity"), 1);
  assert.equal(validatePositiveFinite(0.5, "Size"), 0.5);
  assert.equal(validateNonNegativeFinite(0, "Width"), 0);

  assert.throws(() => validateNonEmptyString("", "Color"), /non-empty/);
  assert.throws(() => validateUnitInterval(2, "Opacity"), /between 0 and 1/);
  assert.throws(() => validatePositiveFinite(0, "Size"), /positive finite/);
  assert.throws(
    () => validateNonNegativeFinite(-1, "Width"),
    /non-negative finite/
  );
});
