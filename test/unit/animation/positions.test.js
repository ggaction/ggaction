import assert from "node:assert/strict";
import test from "node:test";
import { preparePositionInterpolation as prepare, samplePositionInterpolation as sample } from "../../../src/grammar/animation/positions.js";

const endpoint = (value, scale = {}) => ({ value, scale: { type: "linear", domain: [0, 40], range: [0, 400], ...scale } });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-12, `${actual} should equal ${expected}`);

test("semantic values map after interpolation with exact numeric endpoints and resolved range changes", () => {
  const a = endpoint(10), b = endpoint(30), before = structuredClone([a, b]);
  const plan = prepare(a, b);
  assert.ok(Object.isFrozen(plan.from.scale.domain));
  assert.deepEqual([0, .25, .5, .75, 1].map(t => sample(plan, t).position), [100, 150, 200, 250, 300]);
  assert.deepEqual([a, b], before);
  a.scale.range[0] = -100;
  assert.equal(sample(plan, 0).position, 100);
  const resized = prepare(endpoint(10), endpoint(30, { range: [10, 810] }));
  assert.equal(sample(resized, .5).position, 305);
  const reverse = prepare(endpoint(10, { domain: [40, 0] }), endpoint(30, { domain: [40, 0] }));
  assert.equal(sample(reverse, .25).position, 250);
  assert.equal(sample(prepare(endpoint(-10, { clamp: true }), endpoint(80, { clamp: true })), .25).position, 125);
});

test("logarithmic values retain their meaning while domain endpoints morph geometrically", () => {
  const log = { type: "log", domain: [1, 100], range: [0, 200] };
  const plan = prepare(endpoint(1, log), endpoint(100, log));
  const mid = sample(plan, .5);
  assert.equal(mid.value, 50.5);
  close(mid.position, 100 * Math.log10(50.5));
  assert.notEqual(mid.position, 100, "Pixel lerp would erase logarithmic value meaning");
  const moving = sample(prepare(endpoint(1, log), endpoint(100, { ...log, domain: [100, 10000] })), .5);
  close(moving.scale.domain[0], 10); close(moving.scale.domain[1], 1000);
  close(moving.position, 100 * (Math.log10(50.5) - 1));
  const negative = sample(prepare(endpoint(-1, { ...log, domain: [-100, -1] }), endpoint(-100, { ...log, domain: [-100, -1] })), .5);
  close(negative.position, 200 - mid.position);
  const tiny = endpoint(Number.MIN_VALUE, { type: "log", domain: [Number.MIN_VALUE, 4 * Number.MIN_VALUE] });
  assert.equal(sample(prepare(tiny, tiny), .5).value, Number.MIN_VALUE);
});

test("all admitted continuous transforms agree with independent value-space formulas", () => {
  const transforms = [
    ["linear", {}, x => x], ["time", {}, x => x], ["sqrt", {}, x => Math.sign(x) * Math.sqrt(Math.abs(x))],
    ["pow", { exponent: 2 }, x => Math.sign(x) * x * x],
    ["symlog", { constant: 2 }, x => Math.sign(x) * Math.log1p(Math.abs(x) / 2)]
  ];
  for (const [type, parameters, transform] of transforms) {
    const scale = { type, ...parameters, domain: [-10, 30], range: [400, 0] };
    const plan = prepare(endpoint(-8, scale), endpoint(24, scale));
    for (let i = 0; i <= 100; i++) {
      const t = i / 100, value = -8 + 32 * t;
      const expected = 400 * (1 - (transform(value) - transform(-10)) / (transform(30) - transform(-10)));
      close(sample(plan, t).position, expected);
    }
  }
});

test("incompatible mapping policies yield explicit crossfade reasons", () => {
  const cases = [
    [endpoint(1), endpoint(1, { type: "time" }), "scale-type"],
    [endpoint(1), endpoint(1, { clamp: true }), "scale-clamp"],
    [endpoint(1, { type: "pow", exponent: 2 }), endpoint(1, { type: "pow", exponent: 3 }), "scale-parameters"],
    [endpoint(1, { domain: [1, 1] }), endpoint(2), "degenerate-domain"],
    [endpoint(1), endpoint(1, { domain: [40, 0] }), "scale-direction"],
    [endpoint(-1, { type: "log", domain: [-40, -1] }), endpoint(1, { type: "log", domain: [1, 40] }), "log-sign"]
  ];
  for (const [from, to, reason] of cases) assert.deepEqual(prepare(from, to), { kind: "crossfade", reason });
});

test("unrepresentable intermediate mappings fade with a reason and preserve finite endpoints", () => {
  const huge = Number.MAX_VALUE;
  const plan = prepare(endpoint(huge, { domain: [0, 1], range: [0, 1] }), endpoint(0, { domain: [0, 1], range: [0, huge] }));
  assert.equal(sample(plan, 0).position, huge); assert.equal(sample(plan, 1).position, 0);
  assert.deepEqual(sample(plan, .5), { kind: "crossfade", reason: "nonfinite-position" });
  const narrow = prepare(endpoint(1, { domain: [1, 1 + Number.EPSILON] }), endpoint(1, { domain: [1 - Number.EPSILON / 2, 1] }));
  assert.deepEqual(sample(narrow, .5), { kind: "crossfade", reason: "collapsed-domain" });
});

test("closed descriptor-safe position boundaries reject invalid state without evaluating getters", () => {
  let reads = 0;
  const accessor = { get value() { reads++; return 1; }, scale: endpoint(1).scale };
  assert.throws(() => prepare(accessor, endpoint(2)), /accessors/); assert.equal(reads, 0);
  const sparse = []; sparse.length = 2;
  const bad = [null, { ...endpoint(1), extra: 1 }, endpoint(NaN), endpoint(1, { type: "ordinal" }),
    endpoint(1, { domain: [0] }), endpoint(1, { domain: sparse }), endpoint(1, { range: [0, Infinity] }),
    endpoint(1, { clamp: "yes" }), endpoint(1, { clamp: null }), endpoint(1, { base: 2 }),
    endpoint(1, { clamp: undefined }), endpoint(1, { type: "log", domain: [-1, 1] }),
    endpoint(1, { type: "log", domain: [1, 40], base: 1 })];
  for (const value of bad) assert.throws(() => prepare(value, endpoint(2)));
  const plan = prepare(endpoint(1), endpoint(2));
  for (const progress of [-1, 1.1, NaN]) assert.throws(() => sample(plan, progress));
  assert.throws(() => sample({ ...plan, extra: true }, .5));
  assert.throws(() => sample({ ...plan, version: "unknown" }, .5));
  assert.throws(() => sample({ ...plan, to: endpoint(2, { type: "time" }) }, .5));
});
