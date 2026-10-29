import test from "node:test";
import assert from "node:assert/strict";
import { estimateContourDensity } from "../../src/grammar/contour/density.js";
import { contourGrid } from "../../src/grammar/contour/layout.js";
import { contourArea } from "../oracles/contour.js";

const grid = { origin: [0, 0], dx: 1, dy: 1, width: 3, height: 2 };
const near = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const kde = (points, extra = {}) => estimateContourDensity(points, { grid, estimator: "kde", normalization: "unit", bandwidth: [1, 1], kernel: "gaussian", ...extra });

test("two-dimensional Gaussian estimates match literal analytic density and anisotropic bandwidth", () => {
  const point = [{ x: 0, y: 0, weight: 2 }];
  const unit = kde(point), count = kde(point, { normalization: "count" });
  near(unit.grid.values[0], 1 / (2 * Math.PI));
  near(unit.grid.values[1], Math.exp(-0.5) / (2 * Math.PI));
  near(unit.grid.values[4], Math.exp(-1) / (2 * Math.PI));
  count.grid.values.forEach((value, index) => near(value, unit.grid.values[index] * 2));
  const anisotropic = kde(point, { bandwidth: [2, 1] });
  near(anisotropic.grid.values[1], Math.exp(-0.125) / (4 * Math.PI));
  point[0].weight = 20;
  assert.equal(count.totalWeight, 2);
  assert.ok(Object.isFrozen(count.grid.values));
});

test("shared compact kernels preserve literal support, nonnegativity and unit mass", () => {
  const points = [{ x: 0, y: 0 }];
  for (const [kernel, origin, boundary] of [["epanechnikov", 0.5625, 0], ["uniform", 0.25, 0.25], ["triangular", 1, 0]]) {
    const result = kde(points, { kernel });
    near(result.grid.values[0], origin);
    near(result.grid.values[1], boundary);
    near(result.grid.values[2], 0);
    assert.ok(result.grid.values.every(value => value >= 0));
  }
  const sampled = kde(points, { kernel: "triangular", bandwidth: [2, 1], grid: { origin: [-2, -1], dx: 0.25, dy: 0.25, width: 17, height: 9 } });
  near(sampled.grid.values.reduce((sum, value) => sum + value, 0) * 0.25 ** 2, 1);
  const contour = contourGrid(sampled.grid, [0.1, 0.25]);
  assert.equal(contour.thresholds[0].polygons.length, 1);
  assert.ok(contourArea(contour.thresholds[0].polygons) > contourArea(contour.thresholds[1].polygons));
});

test("histogram grid uses shared half-open bins with a final inclusive endpoint and density units", () => {
  const frame = { origin: [0.5, 0.5], dx: 1, dy: 1, width: 2, height: 2 };
  const points = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 1, weight: 2 }];
  const count = estimateContourDensity(points, { grid: frame, estimator: "histogram", normalization: "count" });
  assert.deepEqual(count.grid.values, [1, 1, 0, 3]);
  assert.equal(count.totalWeight, 5);
  const unit = estimateContourDensity(points, { grid: frame, estimator: "histogram", normalization: "unit" });
  near(unit.grid.values.reduce((sum, value) => sum + value, 0), 1);
  const scaled = estimateContourDensity(points.map(point => ({ ...point, x: point.x * 2, y: point.y * 3 })), {
    estimator: "histogram", normalization: "unit", grid: { ...frame, origin: [1, 1.5], dx: 2, dy: 3 }
  });
  scaled.grid.values.forEach((value, index) => near(value, unit.grid.values[index] / 6));
});

test("empty and zero-mass estimators remain zero and KDE admits distant source contributions", () => {
  for (const points of [[], [{ x: 0, y: 0, weight: 0 }]]) {
    assert.deepEqual(kde(points).grid.values, [0, 0, 0, 0, 0, 0]);
    assert.deepEqual(estimateContourDensity(points, { estimator: "histogram", grid, normalization: "unit" }).grid.values, [0, 0, 0, 0, 0, 0]);
  }
  assert.ok(kde([{ x: -1, y: -1 }]).grid.values.every(value => value > 0));
  const mixture = kde([{ x: 0, y: 0, weight: 1 }, { x: 1, y: 0, weight: 3 }]);
  near(mixture.grid.values[0], (1 + 3 * Math.exp(-0.5)) / (8 * Math.PI));
});

test("KDE rescales overflowing coordinate differences and anisotropic products before division", () => {
  const result = kde([{ x: -1e308, y: 0 }], { bandwidth: [1e308, 1e-308],
    grid: { origin: [1e308, 0], dx: 1e307, dy: 1e-308, width: 2, height: 2 } });
  near(result.grid.values[0], Math.exp(-2) / (2 * Math.PI));
  near(result.grid.values[2], Math.exp(-2.5) / (2 * Math.PI));
  assert.deepEqual(kde([{ x: 0, y: 0 }], { bandwidth: [1e308, 1e308] }).grid.values, [0, 0, 0, 0, 0, 0]);
});

test("density input errors and budgets fail before estimation and preserve caller data", () => {
  const points = [{ x: 0, y: 0 }], original = structuredClone(points);
  for (const options of [{ estimator: "other" }, { normalization: "bad" }, { kernel: "bad" },
    { bandwidth: undefined }, { bandwidth: [0, 1] }, { bandwidth: [1] }, { extra: true }]) assert.throws(() => kde(points, options));
  for (const invalid of [[{ x: 0, y: NaN }], [{ x: 0, y: 0, weight: -1 }], [{ x: 0, y: 0, weight: undefined }],
    [{ x: 0, y: 0, extra: true }], [{ x: 0, y: 0, weight: 1e308 }, { x: 0, y: 0, weight: 1e308 }]]) assert.throws(() => kde(invalid));
  let reads = 0;
  assert.throws(() => kde([{ get x() { reads += 1; return 0; }, y: 0 }]), /accessors/);
  assert.equal(reads, 0);
  assert.throws(() => estimateContourDensity(points, { grid, estimator: "histogram", normalization: "unit", kernel: "gaussian" }), /does not accept/);
  assert.throws(() => estimateContourDensity([{ x: -1, y: 0 }], { grid, estimator: "histogram", normalization: "unit" }), /contain every point/);
  assert.throws(() => estimateContourDensity(points, { grid: { ...grid, dx: 1e200, dy: 1e200 }, estimator: "histogram", normalization: "unit" }), /bin area/);
  assert.throws(() => estimateContourDensity(points, { grid: { origin: [2 ** 53 + 2, 0], dx: 2, dy: 1, width: 2, height: 2 }, estimator: "histogram", normalization: "unit" }), /boundaries/);
  assert.throws(() => estimateContourDensity(points, { grid: { origin: [0, 0], dx: 1.3e308, dy: 1e-308, width: 2, height: 2 }, estimator: "histogram", normalization: "unit" }), /boundaries/);
  assert.throws(() => kde(points, { bandwidth: [Number.MIN_VALUE, Number.MIN_VALUE] }), /finite numeric range/);
  assert.throws(() => kde(Array(1001).fill(points[0]), { grid: { ...grid, width: 100, height: 100 } }), /estimation work/);
  assert.deepEqual(points, original);
});

test("density refuses oversized point and bandwidth arrays before reading their elements", () => {
  let reads = 0;
  const oversized = Array(10001);
  Object.defineProperty(oversized, 0, { get() { reads += 1; return { x: 0, y: 0 }; }, enumerable: true });
  assert.throws(() => kde(oversized), /point count/);
  assert.throws(() => kde([], { bandwidth: oversized }), /two positive finite numbers/);
  assert.equal(reads, 0);
});
