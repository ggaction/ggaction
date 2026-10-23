import assert from "node:assert/strict";
import test from "node:test";
import { formatNumericTickValues } from "../../../src/grammar/ticks.js";

test("formats each numeric tick interval with stable trailing zeroes and minus signs", () => {
  const fractions = Object.freeze([-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]);
  assert.deepEqual(formatNumericTickValues(fractions), ["−0.15", "−0.10", "−0.05", "0.00", "0.05", "0.10", "0.15", "0.20", "0.25", "0.30"]);
  assert.deepEqual(formatNumericTickValues([0, 0.1 + 0.2, 0.6]), ["0.0", "0.3", "0.6"]);
  assert.deepEqual(formatNumericTickValues([0, 100, 200, 900]), ["0", "100", "200", "900"]);
  assert.deepEqual(formatNumericTickValues([0.3, 0.2, 0.1]), ["0.3", "0.2", "0.1"]);
});

test("preserves requested order, repeated ticks and input values", () => {
  const values = Object.freeze([1, 0, 0.5, 0, -0, -0.5]);
  assert.deepEqual(formatNumericTickValues(values), ["1.0", "0.0", "0.5", "0.0", "0.0", "−0.5"]);
  assert(Object.is(values[4], -0));
  assert.deepEqual(formatNumericTickValues([]), []);
  assert.deepEqual(formatNumericTickValues([1.25]), ["1.25"]);
  assert.deepEqual(formatNumericTickValues([0, 0]), ["0", "0"]);
});

test("uses extra precision only to distinguish otherwise aliased settled ticks", () => {
  assert.deepEqual(formatNumericTickValues([0.11, 0.12, 0.2]), ["0.11", "0.12", "0.20"]);
  assert.deepEqual(formatNumericTickValues([0, 1e-12]), ["0.000000000000", "0.000000000001"]);
  assert.throws(() => formatNumericTickValues([0, 1e-13]), /12 decimals/);
  assert.throws(() => formatNumericTickValues([0.3, 0.1 + 0.2]), /12 decimals/);
  for (const values of [[NaN], [Infinity], [-Infinity], ["1"], [null], null]) {
    assert.throws(() => formatNumericTickValues(values), /finite tick values/);
  }
});
