import assert from "node:assert/strict";
import test from "node:test";
import { createRouteDensityField, routeDensityAt } from "../../../../../src/grammar/graph/routes/densityField.js";
import { createRouteBudget } from "../../../../../src/grammar/graph/routes/budget.js";
import { denseRouteDensity } from "../../../../oracles/edge-routes.js";

const region = { x: -0.25, y: 0.125, width: 1.5, height: 0.75 };
const sample = (x, y, weight = 1, angle = 0) => ({ x, y, weight, angle });

test("compact support keeps every dense scalar contribution at borders and rounded tangencies", () => {
  for (const size of [8, 17, 65]) for (const bandwidth of [0.015625, 0.1, 0.3]) {
    const points = [sample(-0.25, 0.125), sample(1.25, 0.875, 0.25), sample(0.5, 0.5, 0.125),
      sample(0.5 + bandwidth, 0.5, 0.75), sample(0.5 - bandwidth * (1 - Number.EPSILON), 0.5, 0.5),
      sample(-0.25 - bandwidth, 0.5), sample(5, 5), sample(0.5, 0.5, 0)];
    const actual = createRouteDensityField(points, region, { size, bandwidth, directed: false }, createRouteBudget());
    const expected = denseRouteDensity(points, region, size, bandwidth);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      assert.ok(Math.abs(routeDensityAt(actual, x, y) - expected[y][x]) < 1e-12, `${size}/${bandwidth}/${x}/${y}`);
    }
  }
});

test("directed support keeps distinct opposite tangents and exact channel wrap", () => {
  const bounds = { x: -1, y: -1, width: 2, height: 2 }, points = [sample(0, 0, 2, 0), sample(0, 0, 3, Math.PI)];
  const field = createRouteDensityField(points, bounds, { size: 65, bandwidth: 0.5, directed: true }, createRouteBudget());
  assert.equal(routeDensityAt(field, 32, 32, 0), 2);
  assert.equal(routeDensityAt(field, 32, 32, 2 * Math.PI), 2);
  assert.equal(routeDensityAt(field, 32, 32, Math.PI), 3);
  assert.equal(routeDensityAt(field, 32, 32, Math.PI / 2), 0);
  assert.equal(routeDensityAt(field, 48, 32, 0), 0);
  assert.equal(routeDensityAt(field, 40, 32, 0), 1.125);
});

test("wide compact support avoids corner work without discarding any nonzero cells", () => {
  const budget = createRouteBudget(), points = [sample(0.5, 0.5)];
  const field = createRouteDensityField(points, { x: 0, y: 0, width: 1, height: 1 },
    { size: 65, bandwidth: 0.25, directed: false }, budget);
  // The old bounding square evaluated 33 by 33 cells. The new budget includes
  // every visited candidate plus each chord calculation and the source sample.
  assert.ok(budget.diagnostics().work < 1000);
  assert.ok(budget.diagnostics().work >= field.cells.size);
  assert.equal(field.cells.size, 793);
  assert.equal(routeDensityAt(field, 32, 32), 1);
  assert.equal(routeDensityAt(field, 47, 47), 0);
});

test("field work remains abortable at row boundaries and sample allocation keeps its exact limit", () => {
  let charges = 0;
  assert.throws(() => createRouteDensityField([sample(0.5, 0.5)], { x: 0, y: 0, width: 1, height: 1 },
    { size: 65, bandwidth: 0.25, directed: false }, {
      charge() { if (++charges === 3) throw new DOMException("Stopped", "AbortError"); }, samples() {}
    }), { name: "AbortError" });
  assert.equal(charges, 3);
  assert.throws(() => createRouteDensityField([sample(0.5, 0.5)], { x: 0, y: 0, width: 1, height: 1 },
    { size: 65, bandwidth: 0.25, directed: false }, createRouteBudget({ maxSamples: 10 })), /Route active samples/);
});

test("nonfinite accumulation rejects before a sparse field can escape", () => {
  const options = { size: 65, bandwidth: 0.25, directed: false }, bounds = { x: 0, y: 0, width: 1, height: 1 };
  for (const weight of [Infinity, NaN]) assert.throws(() => createRouteDensityField([sample(0.5, 0.5, weight)], bounds, options, createRouteBudget()), /finite/);
  assert.throws(() => createRouteDensityField([sample(0.5, 0.5, Number.MAX_VALUE), sample(0.5, 0.5, Number.MAX_VALUE)], bounds, options, createRouteBudget()), /finite/);
  const points = [sample(0.5, 0.5, 0)], before = structuredClone(points);
  assert.equal(createRouteDensityField(points, bounds, options, createRouteBudget()).cells.size, 0);
  assert.deepEqual(points, before);
});
