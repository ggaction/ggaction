import assert from "node:assert/strict";
import test from "node:test";

import {
  mapLinear,
  niceDomain,
  niceStep,
  numericTicks,
  quantile
} from "../../oracles/numeric.js";

test("locks the independent linear scale oracle", () => {
  assert.equal(niceStep(87, 5), 20);
  assert.deepEqual(niceDomain([13, 87]), [0, 100]);
  assert.deepEqual(numericTicks([0, 100], 5), [0, 20, 40, 60, 80, 100]);
  assert.deepEqual(numericTicks([100, 0], 5), [100, 80, 60, 40, 20, 0]);
  assert.equal(mapLinear(25, [0, 100], [10, 210]), 60);
  assert.equal(mapLinear(5, [5, 5], [0, 100]), 50);
});

test("locks inclusive linear quantiles independently", () => {
  assert.equal(quantile([1, 3, 5, 7], 0), 1);
  assert.equal(quantile([1, 3, 5, 7], 0.5), 4);
  assert.equal(quantile([1, 3, 5, 7], 1), 7);
});

test("rejects invalid oracle inputs", () => {
  assert.throws(() => niceStep(-1), /non-negative/);
  assert.throws(() => niceDomain([]), /non-empty/);
  assert.throws(() => numericTicks([0]), /two endpoints/);
  assert.throws(() => mapLinear(1, [0, 1], [0]), /two domain and range/);
  assert.throws(() => quantile([1], 2), /between 0 and 1/);
});
