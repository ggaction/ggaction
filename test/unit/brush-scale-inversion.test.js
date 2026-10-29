import test from "node:test";
import assert from "node:assert/strict";
import { invertPositionInterval } from "../../src/grammar/scales/inversion.js";
import { mapContinuousScaleValues } from "../../src/grammar/scales/mapping.js";

const scale = (type = "linear", domain = [0, 100], range = [0, 200], extra = {}) => ({ type, domain, range, ...extra });
const range = bounds => ({ kind: "range", bounds });
const categories = values => ({ kind: "categories", values });
const near = (actual, expected, tolerance = 2e-13) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(Number.MIN_VALUE, Math.abs(expected)), `${actual} differs from ${expected}`);
const band = (extra = {}) => ({ type: "band", domain: ["a", 1, "1", false], range: [0, 400], step: 100,
  start: 20, bandwidth: 60, paddingInner: 0.4, paddingOuter: 0.2, align: 0.5, ...extra });

test("inverts reversed and clipped linear brushes without applying reversal twice", () => {
  assert.deepEqual(invertPositionInterval(scale(), [150, 50]), range([25, 75]));
  assert.deepEqual(invertPositionInterval(scale("linear", [100, 0], [200, 0], { reverse: true }), [50, 150]), range([25, 75]));
  assert.deepEqual(invertPositionInterval(scale(), [-100, 250]), range([0, 100]));
  assert.deepEqual(invertPositionInterval(scale(), [-100, -1]), range(null));
  assert.deepEqual(invertPositionInterval(scale(), [300, 250]), range(null));
  assert.deepEqual(invertPositionInterval(scale(), [40, 40]), range(null));
  assert.deepEqual(invertPositionInterval(scale(), [-100, 0]), range([0, 0]));
  const extreme = invertPositionInterval(scale("linear", [-1e308, 1e308], [-1e308, 1e308]), [-5e307, 5e307]);
  assert.deepEqual(extreme, range([-5e307, 5e307]));
});

test("selects a constant domain only where its forward midpoint lies", () => {
  for (const extent of [[0, 200], [200, 0]]) {
    assert.deepEqual(invertPositionInterval(scale("linear", [7, 7], extent), [99, 101]), range([7, 7]));
    assert.deepEqual(invertPositionInterval(scale("linear", [7, 7], extent), [0, 99]), range(null));
    assert.deepEqual(invertPositionInterval(scale("linear", [7, 7], extent), [101, 200]), range(null));
    assert.deepEqual(invertPositionInterval(scale("linear", [7, 7], extent), [-100, -1]), range(null));
  }
});

test("returns epoch milliseconds through leap and daylight-saving dates", () => {
  const start = Date.parse("2024-02-28T00:00:00Z"), day = 86_400_000;
  assert.deepEqual(invertPositionInterval(scale("time", [start, start + 3 * day], [0, 300]), [100, 200]), range([1709164800000, 1709251200000]));
  const spring = scale("time", [1710050400000, 1710057600000], [0, 200]);
  assert.deepEqual(invertPositionInterval(spring, [50, 150]), range([1710052200000, 1710055800000]));
  assert.deepEqual(invertPositionInterval(scale("time", [123, 123]), [99, 101]), range([123, 123]));
  assert.throws(() => invertPositionInterval(scale("time", [0, 9e15]), [1, 2]), /epoch/);
});

test("inverts positive, negative, reversed and subunit-base logarithmic scales", () => {
  for (const base of [undefined, 2, Math.E, 10, 0.1, 1 + Number.EPSILON]) {
    for (const [domain, expected] of [[[1, 1000], [10, 100]], [[-1000, -1], [-100, -10]], [[1000, 1], [10, 100]], [[-1, -1000], [-100, -10]]]) {
      const result = invertPositionInterval(scale("log", domain, [0, 300], base === undefined ? {} : { base }), [100, 200]);
      result.bounds.forEach((value, i) => near(value, expected[i]));
      assert.deepEqual(invertPositionInterval(scale("log", domain, [300, 0], { base }), [-10, 310]), range([...domain].sort((a, b) => a - b)));
    }
  }
});

test("keeps logarithmic inverses finite across extreme and indistinguishable transformed endpoints", () => {
  const logarithmic = scale("log", [1e-300, 1e300], [0, 600]);
  const result = invertPositionInterval(logarithmic, [100, 500]);
  near(result.bounds[0], 1e-200); near(result.bounds[1], 1e200);
  const collapsed = scale("log", [1e300, 1e300 + 1e284], [0, 100]);
  assert.deepEqual(invertPositionInterval(collapsed, [25, 75]), range([1e300, 1e300 + 1e284]));
  const alternate = scale("log", [9.999999999999999e-123, 1.0000000000000002e-122], [0, 100]);
  assert.ok(invertPositionInterval(alternate, [25, 75]).bounds.every(value => value >= alternate.domain[0] && value <= alternate.domain[1]));
  const tiny = scale("log", [Number.MIN_VALUE, 1e-320], [0, 100]);
  const actual = invertPositionInterval(tiny, [1, 99]);
  assert.ok(actual.bounds.every(value => Number.isFinite(value) && value >= Number.MIN_VALUE && value <= 1e-320));
  assert.deepEqual(invertPositionInterval(logarithmic, [10, 10]), range(null));
});

test("preserves forward roundtrips and nested interval monotonicity", () => {
  for (const value of [scale(), scale("linear", [-7, 11], [130, -20]), scale("time", [0, 10_000], [100, 0]),
    scale("log", [1e-12, 1e12]), scale("log", [-1000, -1], [200, 0], { base: 0.5 })]) {
    const [a, b] = value.range, positions = [0.13, 0.77].map(t => a + t * (b - a));
    const result = invertPositionInterval(value, positions), projected = [...mapContinuousScaleValues(result.bounds, value)].sort((x, y) => x - y);
    projected.forEach((coordinate, i) => near(coordinate, [...positions].sort((x, y) => x - y)[i]));
    const inner = invertPositionInterval(value, [0.3, 0.5].map(t => a + t * (b - a)));
    assert.ok(result.bounds[0] <= inner.bounds[0] && inner.bounds[1] <= result.bounds[1]);
  }
});

test("uses actual padded bands, typed values, boundary intersections and original domain order", () => {
  assert.deepEqual(invertPositionInterval(band(), [75, 125]), categories(["a", 1]));
  assert.deepEqual(invertPositionInterval(band(), [90, 110]), categories([]));
  assert.deepEqual(invertPositionInterval(band(), [80, 90]), categories(["a"]));
  assert.deepEqual(invertPositionInterval(band(), [280, 120]), categories([1, "1"]));
  assert.deepEqual(invertPositionInterval(band(), [-20, 420]), categories(["a", 1, "1", false]));
  assert.deepEqual(invertPositionInterval(band(), [50, 50]), categories([]));
  assert.deepEqual(invertPositionInterval(band(), [410, 420]), categories([]));
  assert.deepEqual(invertPositionInterval(band({ range: [400, 0], start: 380, step: -100 }), [75, 125]), categories(["1", false]));
});

test("reuses ordinal cells and point centers rather than inventing nearest categories", () => {
  const ordinal = { type: "ordinal", domain: ["a", "b"], range: [0, 200], step: 100, bandwidth: 100 };
  assert.deepEqual(invertPositionInterval(ordinal, [99, 101]), categories(["a", "b"]));
  const point = { ...ordinal, type: "point", start: 50, bandwidth: 0, padding: 0.5, align: 0.5 };
  assert.deepEqual(invertPositionInterval(point, [49, 50]), categories(["a"]));
  assert.deepEqual(invertPositionInterval(point, [51, 149]), categories([]));
  assert.deepEqual(invertPositionInterval({ ...point, range: [200, 0], step: -100, start: 150 }, [49, 51]), categories(["b"]));
});

test("rejects unresolved, unsupported or noninvertible scales even for empty gestures", () => {
  for (const type of [undefined, "pow", "sqrt", "symlog", "quantile", "sequential"]) assert.throws(() => invertPositionInterval({ ...scale(), type }, [1, 2]), /position scale/);
  assert.throws(() => invertPositionInterval(scale("linear", [0, 1], [0, 100], { radialMapping: "area" }), [1, 2]), /position scale/);
  for (const value of [null, [], 1]) assert.throws(() => invertPositionInterval(value, [1, 2]), /plain object/);
  for (const input of [[NaN, 1], [1], [1, 2, 3], "auto"]) assert.throws(() => invertPositionInterval(scale(), input));
  for (const value of [scale("linear", [0, Infinity]), scale("linear", [0, 1], [2, 2]), scale("log", [0, 100]),
    scale("log", [-1, 1]), scale("log", [1, 1]), scale("log", [1, 100], [0, 100], { base: 1 })]) {
    assert.throws(() => invertPositionInterval(value, [0, 0]));
  }
  for (const value of [band({ domain: [1, 1] }), band({ domain: [] }), band({ domain: "auto" }), band({ step: 0 }),
    band({ bandwidth: -1 }), band({ bandwidth: 101 }), band({ step: -100 }), band({ start: NaN }),
    band({ type: "point", bandwidth: 1 }), band({ start: Number.MAX_VALUE, step: Number.MAX_VALUE, bandwidth: 0, paddingInner: 0.1 })]) {
    assert.throws(() => invertPositionInterval(value, [1, 2]));
  }
});

test("bounds category allocation and cumulative string work without changing input", () => {
  const domain = Array.from({ length: 10_000 }, (_, i) => i), value = { type: "ordinal", domain, range: [0, 10_000], step: 1, bandwidth: 1 };
  assert.deepEqual(invertPositionInterval(value, [200, 201]), categories([199, 200, 201]));
  assert.throws(() => invertPositionInterval({ ...value, domain: [...domain, 10_000] }, [0, 1]), /10000/);
  const huge = ["x".repeat(5_000_000), "y".repeat(5_000_000)];
  assert.throws(() => invertPositionInterval({ ...value, domain: huge }, [0, 1]), /10000000/);
  const before = structuredClone(band()), interval = [20, 150], original = structuredClone(before);
  const result = invertPositionInterval(before, interval);
  assert.deepEqual(before, original); assert.deepEqual(interval, [20, 150]);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.values));
  before.domain[0] = "changed"; interval[0] = -1;
  assert.deepEqual(result, categories(["a", 1]));
});

test("rejects accessor and sparse arrays before executing values, ignoring inherited options", () => {
  let calls = 0;
  const object = { ...scale(), get base() { calls++; return 10; } };
  assert.throws(() => invertPositionInterval(object, [1, 2]), /own data/);
  const interval = [0, 1]; Object.defineProperty(interval, "0", { get() { calls++; return 0; }, enumerable: true });
  assert.throws(() => invertPositionInterval(scale(), interval), /own data/);
  assert.throws(() => invertPositionInterval(scale(), new Array(2)), /dense/);
  const domain = ["a"]; Object.defineProperty(domain, "0", { get() { calls++; return "a"; }, enumerable: true });
  assert.throws(() => invertPositionInterval(band({ domain }), [1, 2]), /own data/);
  Object.defineProperty(Object.prototype, "radialMapping", { configurable: true, get() { calls++; return "area"; } });
  try { assert.deepEqual(invertPositionInterval(scale(), [10, 20]), range([5, 10])); }
  finally { delete Object.prototype.radialMapping; }
  assert.equal(calls, 0);
});
