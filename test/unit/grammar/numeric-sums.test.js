import assert from "node:assert/strict";
import test from "node:test";
import { stableFiniteSum, stableFinitePrefixSums } from "../../../src/grammar/numeric.js";

const precise = { compensated: true };

test("explicit compensated sums preserve integer totals and cancellation with literal expectations", () => {
  for (const [values, expected] of [
    [[], 0], [[-0, 0], 0], [[1e16, 1, 1], 10000000000000002],
    [[1e16, 1, -1e16], 1], [[1, 1e16, -1e16], 1],
    [[3, 7, 159, 1], 170], [[Number.MIN_VALUE, Number.MIN_VALUE], 2 * Number.MIN_VALUE],
    [[Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE], Number.MAX_VALUE]
  ]) {
    const before = [...values];
    assert.equal(stableFiniteSum(values, "sum", precise), expected);
    assert.deepEqual(values, before);
  }
  assert.deepEqual(stableFinitePrefixSums([1e16, 1, -1e16], "prefix", precise), [1e16, 1e16, 1]);
  assert.deepEqual(stableFinitePrefixSums([1, 1e16, -1e16], "prefix", precise), [1, 1e16, 1]);
  assert.deepEqual(stableFinitePrefixSums([-0, 0], "prefix", precise), [0, 0]);
  assert.deepEqual(stableFinitePrefixSums([], "prefix", precise), []);
});

test("sum defaults retain existing finite accumulation and scaled overflow behavior", () => {
  assert.equal(stableFiniteSum([1e16, 1, -1e16]), 0);
  assert.equal(stableFiniteSum([1e16, 1, -1e16], "sum", { compensated: false }), 0);
  assert.deepEqual(stableFinitePrefixSums([1e16, 1, -1e16]), [1e16, 1e16, 0]);
  assert.equal(stableFiniteSum([Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE]), Number.MAX_VALUE);
  assert.throws(() => stableFinitePrefixSums([Number.MAX_VALUE, Number.MAX_VALUE]), /finite/);
});

test("compensated sums reject invalid inputs and unrepresentable sums or prefixes", () => {
  for (const values of [null, [NaN], [Infinity], ["1"]]) {
    assert.throws(() => stableFiniteSum(values, "sum", precise));
    assert.throws(() => stableFinitePrefixSums(values, "prefix", precise));
  }
  for (const values of [[Number.MAX_VALUE, Number.MAX_VALUE], [-Number.MAX_VALUE, -Number.MAX_VALUE]]) {
    assert.throws(() => stableFiniteSum(values, "sum", precise), /finite/);
    assert.throws(() => stableFinitePrefixSums(values, "prefix", precise), /finite/);
  }
});
