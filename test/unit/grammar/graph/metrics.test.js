import assert from "node:assert/strict";
import test from "node:test";
import { graphMetricPair, EARTH_MEAN_RADIUS_METERS } from "../../../../src/grammar/graph/metrics.js";
import { normalizeGraphMetric } from "../../../../src/grammar/graph/metricPolicy.js";
import { directMetricPair } from "../../../oracles/graphMetrics.js";

const close = (a, b, relative = 1e-12) => assert.ok(Math.abs(a - b) <= relative * Math.max(Math.abs(b), 1e-300), `${a} != ${b}`);
const pair = (metric, a, b, options = {}) => graphMetricPair(a, b, { metric, ...options });

test("anchors five metrics with independent literal distances and similarities", () => {
  assert.deepEqual(pair("euclidean", [0, 0], [3, 4]), { distance: 5 });
  assert.deepEqual(pair("manhattan", [0, 0], [3, 4]), { distance: 7 });
  assert.deepEqual(pair("cosine", [1, 0], [-1, 0]), { similarity: -1, distance: 2 });
  assert.deepEqual(pair("jaccard", ["a", "b"], ["b", "c"]), { similarity: 1 / 3, distance: 1 - 1 / 3 });
  assert.equal(EARTH_MEAN_RADIUS_METERS, 6371008.8);
  close(pair("great-circle", [0, 0], [90, 0]).distance, 10007557.221017962);
  assert.equal(pair("great-circle", [0, 0], [90, 0]).unit, "m");
});
test("moderate seeded vectors agree with direct formulas and metric symmetry", () => {
  let state = 431;
  const next = () => ((state = (state * 1664525 + 1013904223) >>> 0) % 41) - 20;
  for (let sample = 0; sample < 100; sample++) {
    const a = Array.from({ length: 5 }, next), b = Array.from({ length: 5 }, next);
    const reference = directMetricPair(a, b);
    for (const metric of ["euclidean", "manhattan", "cosine"]) {
      const forward = pair(metric, a, b), backward = pair(metric, b, a);
      if (metric === "cosine") assert.ok(Math.abs(forward.similarity - reference.cosine) <= 1e-12);
      else close(forward.distance, reference[metric]);
      close(forward.distance, backward.distance);
      assert.ok(forward.distance >= 0);
    }
  }
});
test("scaled norms retain finite extreme magnitudes and reject genuinely overflowing results", () => {
  close(pair("euclidean", [1e308, 1e308], [0, 0]).distance, Math.SQRT2 * 1e308);
  close(pair("euclidean", [3e-300, 4e-300], [0, 0]).distance, 5e-300);
  assert.equal(pair("euclidean", [0, 0], [0, 0]).distance, 0);
  close(pair("cosine", [1e308, 1e308], [1e308, 1e308]).similarity, 1);
  close(pair("cosine", [1e-300, 0], [0, 1e-300]).similarity, 0);
  assert.throws(() => pair("euclidean", [Number.MAX_VALUE], [-Number.MAX_VALUE]), /finite numeric range/);
  assert.throws(() => pair("euclidean", [Number.MAX_VALUE, Number.MAX_VALUE], [0, 0]), /finite numeric range/);
  assert.throws(() => pair("manhattan", [1e308, 1e308], [0, 0]), /finite numeric range/);
});
test("cosine zero policy is explicit, applies to either endpoint and preserves negative similarity", () => {
  assert.throws(() => pair("cosine", [0, 0], [1, 0]), /nonzero/);
  for (const [a, b] of [[[0, 0], [1, 0]], [[1, 0], [0, 0]], [[0, 0], [0, 0]]]) {
    assert.deepEqual(pair("cosine", a, b, { zeroVector: "zero-similarity" }), { similarity: 0, distance: 1 });
  }
  assert.throws(() => normalizeGraphMetric({ metric: "cosine", zeroVector: null }), /zeroVector/);
  assert.throws(() => normalizeGraphMetric({ metric: "euclidean", zeroVector: "error" }), /only applicable/);
});
test("Jaccard deduplicates typed scalar identities without conflating number, string, bigint or date", () => {
  assert.deepEqual(pair("jaccard", [], []), { similarity: 1, distance: 0 });
  assert.deepEqual(pair("jaccard", [], [1]), { similarity: 0, distance: 1 });
  assert.equal(pair("jaccard", [1, 1, "1", 1n, true, new Date(0)], [1, new Date(0)]).similarity, 2 / 5);
  assert.equal(pair("jaccard", [-0], [0]).similarity, 1);
  for (const value of [null, undefined, NaN, Infinity, {}, [], new Date(NaN)]) {
    assert.throws(() => pair("jaccard", [value], []), /typed scalars|Row keys/);
  }
});
test("great-circle wraps longitudes, preserves antipodal and polar limits, and validates latitude", () => {
  assert.equal(pair("great-circle", [0, 0], [360, 0]).distance, 0);
  close(pair("great-circle", [179, 0], [-179, 0]).distance, 222390.1604670658);
  close(pair("great-circle", [0, 0], [180, 0]).distance, 20015114.442035925);
  assert.equal(pair("great-circle", [-120, 90], [80, 90]).distance, 0);
  assert.equal(pair("great-circle", [-120, -90], [80, -90]).distance, 0);
  assert.ok(Number.isFinite(pair("great-circle", [Number.MAX_VALUE, 0], [-Number.MAX_VALUE, 0]).distance));
  for (const value of [[0, 91], [0, -91], [0], [0, 0, 1], [Infinity, 0]]) {
    assert.throws(() => pair("great-circle", value, [0, 0]), /latitude|finite numbers/);
  }
});
test("metric boundaries reject wrong dimensions, getters, holes, unknown options and excessive work", () => {
  for (const value of [[], [null], [undefined], ["1"], [NaN], [Infinity]]) {
    assert.throws(() => pair("euclidean", value, [1]), /finite numbers/);
  }
  assert.throws(() => pair("euclidean", [1], [1, 2]), /dimensions/);
  assert.throws(() => pair("missing", [1], [2]), /Unsupported/);
  assert.throws(() => pair("euclidean", [1], [2], { extra: true }), /Unknown/);
  assert.throws(() => pair("euclidean", new Array(2), [1, 2]), /dense/);
  assert.throws(() => pair("euclidean", new Array(2500001), [1]), /must not exceed/);
  let calls = 0;
  const value = [1];Object.defineProperty(value, "0", { get() { calls++;return 1; }, enumerable: true });
  assert.throws(() => pair("euclidean", value, [1]), /accessors/);
  assert.throws(() => graphMetricPair([1], [1], { get metric() { calls++;return "euclidean"; } }), /accessors/);
  assert.equal(calls, 0);
  const a = Object.freeze([3, 4]), b = Object.freeze([0, 0]);
  assert.ok(Object.isFrozen(pair("euclidean", a, b)));
  assert.deepEqual(a, [3, 4]);
});
