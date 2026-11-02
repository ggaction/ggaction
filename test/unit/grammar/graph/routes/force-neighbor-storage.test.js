import assert from "node:assert/strict";
import test from "node:test";
import { FDEB_EPSILON, forceEdgeMetric, forceCompatibility } from "../../../../../src/grammar/graph/routes/compatibility.js";
import { buildForceNeighbors, forEachForceNeighbor, disposeForceNeighbors } from "../../../../../src/grammar/graph/routes/forceNeighbors.js";
import { advanceForceRoutes, forceRouteSchedule } from "../../../../../src/grammar/graph/routes/forceDirected.js";
import { resampleRoute } from "../../../../../src/grammar/graph/routes/polyline.js";
import { scalarRouteForceStep } from "../../../../oracles/edge-routes.js";

const p = (x, y) => ({ x, y });
const metric = forceEdgeMetric([p(0, 0), p(1, 0)]);
function original() {
  const count = 100, raw = Array.from({ length: count }, (_, i) => p(200 + 150 * Math.cos(2 * Math.PI * i / count), 200 + 150 * Math.sin(2 * Math.PI * i / count)));
  const left = Math.min(...raw.map(point => point.x)), top = Math.min(...raw.map(point => point.y));
  const scale = Math.max(Math.max(...raw.map(point => point.x)) - left, Math.max(...raw.map(point => point.y)) - top);
  const points = raw.map(point => p((point.x - left) / scale, (point.y - top) / scale));
  return points.map((point, i) => [point, points[(i + Math.floor(count / 3)) % count]]);
}
function scalarNeighbors(metrics, directed, threshold) {
  const neighbors = metrics.map(() => []);
  for (let a = 0; a < metrics.length; a++) for (let b = a + 1; b < metrics.length; b++) {
    const pair = forceCompatibility(metrics[a], metrics[b], directed);
    if (pair.compatibility > 0 && pair.compatibility >= threshold) {
      neighbors[a].push({ edge: b, compatibility: pair.compatibility, reverse: pair.reverse });
      neighbors[b].push({ edge: a, compatibility: pair.compatibility, reverse: pair.reverse });
    }
  }
  return neighbors;
}

test("typed upper neighbors preserve all scalar results across the original schedule and chunk boundaries", () => {
  const fixtures = [
    { edges: original(), directed: false, threshold: .6 },
    { edges: original(), directed: false, threshold: .6, chunk: 17 },
    { edges: [[p(-0, 0), p(1, -0)], [p(1, -0), p(-0, 0)], [p(0, 0), p(0, 0)], [p(0, .1), p(1, .1)]], directed: false, threshold: 0, chunk: 2 },
    { edges: [[p(0, 0), p(1, 0)], [p(1, 0), p(0, 0)], [p(0, 0), p(1, 0)], [p(0, 1), p(1, 1)]], directed: true, threshold: 1, chunk: 1 },
    { edges: [[p(0, 0), p(1e-10, 0)], [p(0, 0), p(1, 0)], [p(0, 0), p(0, 0)]], directed: false, threshold: 0, chunk: 2 }
  ];
  let comparisons = 0;
  for (const { edges, directed, threshold, chunk } of fixtures) {
    const before = structuredClone(edges), metrics = edges.map(forceEdgeMetric), lengths = metrics.map(value => value.length);
    const active = metrics.flatMap((value, i) => value.length > FDEB_EPSILON ? [i] : []);
    const table = buildForceNeighbors(metrics, active, directed, threshold, () => {}, chunk), neighbors = scalarNeighbors(metrics, directed, threshold);
    try {
      const actualPairs = [], expectedPairs = [];
      forEachForceNeighbor(table, (a, b, compatibility, reverse) => actualPairs.push([a, b, compatibility, reverse]));
      neighbors.forEach((entries, a) => entries.forEach(({ edge: b, compatibility, reverse }) => { if (b > a) expectedPairs.push([a, b, compatibility, reverse]); }));
      assert.deepEqual(actualPairs, expectedPairs);
      assert.deepEqual([...table.degrees], neighbors.map(entries => entries.length));
      assert.equal(table.pairs, expectedPairs.length);
      let routes = edges;
      for (const cycle of forceRouteSchedule()) {
        routes = routes.map((route, i) => lengths[i] <= FDEB_EPSILON ? route : resampleRoute(route, cycle.internalSamples + 2));
        for (let iteration = 0; iteration < cycle.iterations; iteration++) {
          const expected = scalarRouteForceStep(routes, lengths, neighbors, cycle.step);
          const actual = advanceForceRoutes(routes, lengths, table, cycle.step, true);
          assert.deepEqual(actual, expected);
          assert.deepEqual(actual, advanceForceRoutes(routes, lengths, neighbors, cycle.step, true));
          routes = actual.routes; comparisons++;
        }
      }
      assert.deepEqual(edges, before);
    } finally { disposeForceNeighbors(table); }
    assert.equal(table.bytes, 0); assert.equal(table.pairs, 0); assert.equal(table.offsets, undefined); assert.equal(table.degrees, undefined); assert.deepEqual(table.chunks, []);
    disposeForceNeighbors(table);
  }
  assert.equal(comparisons, 825);
});

test("buffer reservation is bounded by the original candidate count and allocates only whole chunks", () => {
  const table = buildForceNeighbors([metric, metric, metric, metric], [0, 1, 2, 3], false, 0, () => {}, 4);
  assert.deepEqual([...table.offsets], [0, 3, 5, 6, 6]);
  assert.deepEqual([...table.degrees], [3, 3, 3, 3]);
  assert.deepEqual(table.chunks.map(chunk => chunk.targets.length), [4, 2]);
  const bytes = table.offsets.byteLength + table.degrees.byteLength + table.chunks.reduce((sum, chunk) => sum + chunk.targets.byteLength + chunk.weights.byteLength + chunk.reverse.byteLength, 0);
  assert.equal(table.bytes, bytes); assert.equal(bytes, 8 * 4 + 4 + 13 * 6);
  disposeForceNeighbors(table);
  const empty = buildForceNeighbors([], [], false, 0, () => {});
  assert.equal(empty.bytes, 4); assert.deepEqual([...empty.offsets], [0]); disposeForceNeighbors(empty);
  for (const chunk of [0, -1, NaN, Infinity, 2 ** 32]) assert.throws(() => buildForceNeighbors([], [], false, 0, () => {}, chunk), /bounded integers/);
  for (const count of [-1, 2 ** 32, Number.MAX_SAFE_INTEGER]) assert.throws(() => buildForceNeighbors({ length: count }, [], false, 0, () => {}), /bounded integers/);
  assert.throws(() => buildForceNeighbors([], { length: 100000 }, false, 0, () => {}), /bounded integers/);
});

test("abort and allocation failures release partial storage without returning a candidate", () => {
  const controller = new AbortController(), original = globalThis.Float64Array, arrays = [metric, metric, metric];
  const before = structuredClone(arrays); let allocations = 0;
  try {
    globalThis.Float64Array = new Proxy(original, { construct(Target, args) { allocations++; controller.abort(); return new Target(...args); } });
    assert.throws(() => buildForceNeighbors(arrays, [0, 1, 2], false, 0, () => controller.signal.throwIfAborted(), 1), { name: "AbortError" });
    assert.equal(allocations, 1);
    assert.throws(() => buildForceNeighbors(arrays, [0, 1, 2], false, 0, () => controller.signal.throwIfAborted()), { name: "AbortError" });
    assert.equal(allocations, 1);
    globalThis.Float64Array = new Proxy(original, { construct() { throw new RangeError("allocation failed"); } });
    assert.throws(() => buildForceNeighbors(arrays, [0, 1, 2], false, 0, () => {}), /allocation failed/);
  } finally { globalThis.Float64Array = original; }
  assert.deepEqual(arrays, before);
  const large = forceEdgeMetric([p(0, 0), p(1e308, 0)]);
  assert.throws(() => buildForceNeighbors([large, large], [0, 1], true, 0, () => {}), /finite/);
  const table = buildForceNeighbors([metric], [0], false, 0, () => {});
  try { assert.throws(() => advanceForceRoutes([[p(0, 0), p(1e308, 0), p(0, 0)]], [1], table, 1, true), /finite/); }
  finally { disposeForceNeighbors(table); }
});
