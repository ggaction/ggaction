import test from "node:test";
import assert from "node:assert/strict";
import { contourGrid } from "../../src/grammar/contour/layout.js";
import { stitchContourRings } from "../../src/grammar/contour/rings.js";
import { contourArea, signedRingArea, locateContourPoint, clipScalarPlane } from "../oracles/contour.js";

const grid = (values, width = 3, height = 3, options = {}) => ({ origin: [0, 0], dx: 1, dy: 1, width, height, values, ...options });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test("a literal hill has a closed interpolated diamond and shared nested bands", () => {
  const source = grid([0, 0, 0, 0, 2, 0, 0, 0, 0]);
  const result = contourGrid(source, [0, 1, 2]);
  assert.deepEqual(result.thresholds[1].polygons, [{ outer: [[0.5, 1], [1, 0.5], [1.5, 1], [1, 1.5], [0.5, 1]], holes: [] }]);
  assert.deepEqual(result.thresholds[2].polygons, []);
  near(contourArea(result.thresholds[0].polygons), 4);
  near(contourArea(result.bands[0].polygons), 3.5);
  near(contourArea(result.bands[1].polygons), 0.5);
  assert.equal(result.bands[0].upperInclusive, false);
  assert.equal(result.bands[1].upperInclusive, true);
  assert.ok(Object.isFrozen(result.grid.values));
  source.values[4] = 99;
  assert.equal(result.grid.values[4], 2);
});

test("the asymptotic determinant distinguishes saddles from center averaging and fixes exact ties", () => {
  const connected = contourGrid(grid([1, -2, -0.25, 1], 2, 2), [0]).thresholds[0].polygons;
  assert.equal(connected.length, 1); // The center is negative, but the determinant is positive.
  const separated = contourGrid(grid([1, -2, -2, 1], 2, 2), [0]).thresholds[0].polygons;
  assert.equal(separated.length, 2);
  const tie = contourGrid(grid([1, -1, -1, 1], 2, 2), [0]).thresholds[0].polygons;
  assert.equal(tie.length, 1);
  const opposite = contourGrid(grid([-1, 1, 1, -1], 2, 2), [0]).thresholds[0].polygons;
  assert.equal(opposite.length, 2);
  assert.equal(contourGrid(grid([-1, 2, 2, -1], 2, 2), [0]).thresholds[0].polygons.length, 1);
});

test("donut holes, missing quads and disconnected islands keep separate winding and topology", () => {
  const donut = contourGrid(grid([2, 2, 2, 2, 0, 2, 2, 2, 2]), [1]).thresholds[0].polygons;
  assert.equal(donut.length, 1);
  assert.equal(donut[0].holes.length, 1);
  near(contourArea(donut), 3.5);
  assert.ok(signedRingArea(donut[0].outer) > 0);
  assert.ok(signedRingArea(donut[0].holes[0]) < 0);
  assert.equal(locateContourPoint(donut, [1, 1]), false);
  assert.equal(locateContourPoint(donut, [0.1, 0.1]), true);
  const values = Array(25).fill(2); values[12] = null;
  const missing = contourGrid(grid(values, 5, 5), [1]).thresholds[0].polygons;
  assert.equal(missing[0].holes.length, 1);
  near(contourArea(missing), 12);
  const islands = contourGrid(grid([0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0], 5, 3), [1]).thresholds[0].polygons;
  assert.equal(islands.length, 2);
  near(contourArea(islands), 1);
});

test("constant and all-missing grids retain empty levels and assign the last upper endpoint once", () => {
  const empty = contourGrid(grid(Array(9).fill(null)), [0, 1]);
  assert.deepEqual(empty.thresholds.map(level => level.polygons), [[], []]);
  assert.deepEqual(empty.bands[0].polygons, []);
  const atMiddle = contourGrid(grid(Array(9).fill(1)), [0, 1, 2]);
  assert.deepEqual(atMiddle.bands[0].polygons, []);
  near(contourArea(atMiddle.bands[1].polygons), 4);
  const atUpper = contourGrid(grid(Array(9).fill(2)), [0, 1, 2]);
  near(contourArea(atUpper.bands[1].polygons), 4);
  assert.deepEqual(contourGrid(grid(Array(9).fill(-1)), [0]).thresholds[0].polygons, []);
});

test("an island inside a hole remains a separate polygon and nested holes choose their enclosing ring", () => {
  const values = Array.from({ length: 81 }, (_, index) => {
    const x = index % 9, y = Math.floor(index / 9);
    return x === 0 || x === 8 || y === 0 || y === 8 || x >= 3 && x <= 5 && y >= 3 && y <= 5 && !(x === 4 && y === 4) ? 2 : 0;
  });
  const polygons = contourGrid(grid(values, 9, 9), [1]).thresholds[0].polygons;
  assert.equal(polygons.length, 2);
  assert.deepEqual(polygons.map(polygon => polygon.holes.length), [1, 1]);
  for (const [point, inside] of [[[0.1, 0.1], true], [[2, 2], false], [[3, 3], true], [[4, 4], false]]) {
    assert.equal(locateContourPoint(polygons, point), inside);
  }
});

test("linear scalar planes match an independent clipped-polygon oracle across orientation and scale", () => {
  const rectangle = [[0, 0], [3, 0], [3, 2], [0, 2]];
  for (const coefficients of [[1, 2, -1], [-2, 1, 3], [0, 1, 0], [1, 0, 0]]) {
    const values = Array.from({ length: 12 }, (_, index) => coefficients[0] * (index % 4) + coefficients[1] * Math.floor(index / 4) + coefficients[2]);
    const result = contourGrid(grid(values, 4, 3), [-8, 0.5, 1, 2.5, 8]);
    for (const band of result.bands) {
      const oracle = clipScalarPlane(rectangle, coefficients, band.lower, band.upper);
      near(contourArea(band.polygons), oracle.length ? signedRingArea(oracle) : 0);
    }
    near(result.bands.reduce((sum, band) => sum + contourArea(band.polygons), 0), 6);
  }
  const translated = contourGrid(grid([0, 0, 0, 0, 2, 0, 0, 0, 0], 3, 3, { origin: [-4, 8], dx: 2, dy: 3 }), [1]);
  near(contourArea(translated.thresholds[0].polygons), 3);
});

test("invalid grid descriptors, scalar values, precision and work fail without reading accessors", () => {
  const good = grid(Array(9).fill(1));
  let reads = 0;
  assert.throws(() => contourGrid({ ...good, get dx() { reads += 1; return 1; } }, [0]), /accessors/);
  assert.equal(reads, 0);
  for (const patch of [{ width: 1 }, { height: 2.5 }, { dx: 0 }, { dy: Infinity }, { origin: [0] },
    { origin: [1e30, 0] }, { values: [1] }, { values: [1, 1, 1, 1, NaN, 1, 1, 1, 1] }, { extra: true }]) {
    assert.throws(() => contourGrid({ ...good, ...patch }, [0]));
  }
  const sparse = Array(9); sparse[0] = 1;
  assert.throws(() => contourGrid({ ...good, values: sparse }, [0]), /dense/);
  for (const levels of [[], [1, 1], [2, 1], [Infinity], [NaN]]) assert.throws(() => contourGrid(good, levels));
  assert.throws(() => contourGrid({ ...good, width: 101, height: 100 }, [0]), /point count/);
  assert.throws(() => contourGrid(grid(Array(10000).fill(1), 100, 100), Array.from({ length: 40 }, (_, index) => index)), /marching work/);
  assert.throws(() => contourGrid(grid(Array.from({ length: 10000 }, (_, index) => (index % 100 + Math.floor(index / 100)) % 2), 100, 100), [0.5]), /boundary segment count/);
  assert.throws(() => contourGrid(grid([0, 2, 0, 2], 2, 2, { origin: [2 ** 53, 0], dx: 2 }), [1]), /coordinate frame/);
  assert.throws(() => contourGrid(grid([0, 0, 2, 2], 2, 2, { origin: [0, 2 ** 53 + 2], dy: 2 }), [1]), /coordinate frame/);
  const huge = contourGrid(grid([-1e308, 1e308, -1e308, 1e308], 2, 2), [0]);
  near(contourArea(huge.thresholds[0].polygons), 0.5);
});

test("deterministic varied grids conserve band area with exactly one region at each sampled point", () => {
  let seed = 12345;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let sample = 0; sample < 100; sample += 1) {
    const source = grid(Array.from({ length: 16 }, () => Math.floor(next() * 5) - 2), 4, 4);
    const result = contourGrid(source, [-3, -1, 0, 1, 3]);
    near(result.bands.reduce((sum, band) => sum + contourArea(band.polygons), 0), 9);
    for (let index = 0; index < 20; index += 1) {
      const point = [next() * 3, next() * 3];
      assert.equal(result.bands.filter(band => locateContourPoint(band.polygons, point)).length, 1);
    }
  }
});

test("ring assembly rejects open boundaries and orphan holes instead of inventing connections", () => {
  const a = { id: "a", x: 0, y: 0 }, b = { id: "b", x: 1, y: 0 }, c = { id: "c", x: 0, y: 1 };
  assert.throws(() => stitchContourRings([[a, b]], grid([])), /closed rings/);
  assert.throws(() => stitchContourRings([[a, c], [c, b], [b, a]], grid([])), /enclosing outer ring/);
});

test("masked scalar grids conserve exactly the area of complete quads", () => {
  let seed = 54321;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let sample = 0; sample < 100; sample += 1) {
    const values = Array.from({ length: 25 }, () => next() < 0.2 ? null : Math.floor(next() * 5) - 2);
    let expected = 0;
    for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
      if ([y * 5 + x, y * 5 + x + 1, (y + 1) * 5 + x, (y + 1) * 5 + x + 1].every(index => values[index] !== null)) expected += 1;
    }
    const result = contourGrid(grid(values, 5, 5), [-3, -1, 0, 1, 3]);
    near(result.bands.reduce((sum, band) => sum + contourArea(band.polygons), 0), expected);
  }
});
