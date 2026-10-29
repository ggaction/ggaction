import test from "node:test";
import assert from "node:assert/strict";
import { invertAngularInterval } from "../../src/grammar/scales/angularInversion.js";
import { polarThetaAtPoint } from "../../src/grammar/polar.js";
const rad = angle => angle * Math.PI / 180;
const linear = { type: "linear", domain: [0, 360], range: [0, 360] };
const near = (actual, expected) => { assert.equal(actual.ranges.length, expected.length); actual.ranges.forEach((range, i) => {
  assert.ok(Math.abs(range.min - expected[i][0]) < 1e-10); assert.ok(Math.abs(range.max - expected[i][1]) < 1e-10);
}); };
test("angular inversion preserves seam sides, shifted origins, reversal and degenerate endpoints", () => {
  near(invertAngularInterval(linear, rad(350), rad(10)), [[0, 10], [350, 360]]);
  near(invertAngularInterval({ ...linear, range: [-180, 180] }, rad(350), rad(10)), [[170, 190]]);
  near(invertAngularInterval({ ...linear, range: [360, 0] }, rad(350), rad(10)), [[0, 10], [350, 360]]);
  near(invertAngularInterval({ ...linear, range: [720, 1080] }, rad(350), rad(10)), [[0, 10], [350, 360]]);
  near(invertAngularInterval(linear, rad(350), 0), [[0, 0], [350, 360]]);
  assert.deepEqual(invertAngularInterval(linear, 0, 0), { ranges: [] });
  near(invertAngularInterval({ ...linear, range: [10, 180] }, rad(350), rad(10)), [[0, 0]]);
  assert.deepEqual(invertAngularInterval({ ...linear, range: [20, 180] }, rad(350), rad(10)), { ranges: [] });
});
test("angular inverse retains native log/time values and typed domain-order category bands", () => {
  near(invertAngularInterval({ type: "log", domain: [1, 1000], range: [0, 360] }, 0, rad(120)), [[1, 10], [1000, 1000]]);
  near(invertAngularInterval({ type: "time", domain: [0, 86400000], range: [0, 360] }, 0, rad(90)), [[0, 21600000], [86400000, 86400000]]);
  const categories = { type: "ordinal", domain: [1, "1", true, "last"], range: [0, 360], step: 90, bandwidth: 90 };
  assert.deepEqual(invertAngularInterval(categories, rad(350), rad(10)), { values: [1, "last"] });
  assert.deepEqual(invertAngularInterval({ ...categories, range: [360, 0], step: -90 }, rad(350), rad(10)), { values: [1, "last"] });
  assert.deepEqual(invertAngularInterval(categories, 0, 0), { values: [] });
});
test("angular calculations reject invalid and inactive scale state without mutating inputs", () => {
  const before = JSON.stringify(linear); invertAngularInterval(linear, 0, 1); assert.equal(JSON.stringify(linear), before);
  for (const scale of [{ ...linear, range: [0, 361] }, { ...linear, range: [0, 0] }, { ...linear, type: "sqrt" }, { ...linear, domain: [NaN, 1] }]) assert.throws(() => invertAngularInterval(scale, 0, 0));
  for (const angle of [-1, NaN, Infinity, 2 * Math.PI]) assert.throws(() => invertAngularInterval(linear, angle, 0));
  let calls = 0; const bad = { ...linear, get range() { calls++; return [0, 360]; } }; assert.throws(() => invertAngularInterval(bad, 0, 1), /own data/); assert.equal(calls, 0);
  assert.throws(() => invertAngularInterval({ type: "ordinal", domain: Array.from({ length: 10001 }, (_, i) => i), range: [0, 360], step: 1, bandwidth: 1 }, 0, 1), /10000/);
});
test("polar inverse direction uses top zero and clockwise quadrants and diagnoses the center", () => {
  const frame = { centerX: 10, centerY: 20 };
  for (const [point, angle] of [[{ x: 10, y: 10 }, 0], [{ x: 20, y: 20 }, 90], [{ x: 10, y: 30 }, 180], [{ x: 0, y: 20 }, 270]]) assert.equal(polarThetaAtPoint(point, frame), angle);
  assert.equal(polarThetaAtPoint({ x: 10, y: 20 }, frame), null);
  assert.equal(polarThetaAtPoint({ x: -1e-16, y: -1 }, { centerX: 0, centerY: 0 }), 0);
  assert.throws(() => polarThetaAtPoint({ x: NaN, y: 1 }, frame), /finite/);
  assert.throws(() => polarThetaAtPoint({ x: 1e308, y: 1 }, { centerX: -1e308, centerY: 0 }), /finite/);
});
test("periodic inverse agrees with independent forward sampling under shifts and reversal", () => {
  for (const range of [[0, 360], [-180, 180], [40, 300], [300, 40], [720, 1080], [360, 0]]) {
    for (const [from, to] of [[20, 80], [350, 10], [240, 30], [60, 280]]) {
      const result = invertAngularInterval({ type: "linear", domain: [-10, 90], range }, rad(from), rad(to));
      assert.ok(result.ranges.length <= 2);
      for (let index = 0; index <= 100; index++) {
        const value = index - 10, screen = range[0] + index / 100 * (range[1] - range[0]), angle = ((screen % 360) + 360) % 360;
        if (Math.abs(angle - from) < 1e-10 || Math.abs(angle - to) < 1e-10) continue;
        const expected = from < to ? angle >= from && angle <= to : angle >= from || angle <= to;
        assert.equal(result.ranges.some(r => value >= r.min && value <= r.max), expected, JSON.stringify({ range, from, to, value, angle }));
      }
    }
  }
});
test("angular band work is cumulative across seam inversions and validates before callbacks", () => {
  const scale = { type: "point", domain: Array.from({ length: 1000 }, (_, i) => `${i}:${"x".repeat(1200)}`), range: [0, 360], start: 0, step: 360 / 999, bandwidth: 0 };
  assert.throws(() => invertAngularInterval(scale, rad(350), rad(10)), /Angular brush work/);
  const band = { type: "band", domain: ["a", "b"], range: [-180, 180], start: -180, step: 180, bandwidth: 180 };
  assert.deepEqual(invertAngularInterval(band, rad(350), rad(10)), { values: ["a", "b"] });
  let reads = 0; assert.throws(() => polarThetaAtPoint({ get x() { reads++; return 1; }, y: 0 }, { centerX: 0, centerY: 0 }), /own data/); assert.equal(reads, 0);
  assert.throws(() => polarThetaAtPoint({}, { centerX: 0, centerY: 0 }), /finite/);
});
