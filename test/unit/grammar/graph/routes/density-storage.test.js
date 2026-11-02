import assert from "node:assert/strict";
import test from "node:test";
import { normalizeObservedGraph } from "../../../../../src/grammar/graph/normalize.js";
import { createRouteBudget } from "../../../../../src/grammar/graph/routes/budget.js";
import { prepareRouteInput, finalizeRouteResult } from "../../../../../src/grammar/graph/routes/common.js";
import { routeLength, resampleRoute } from "../../../../../src/grammar/graph/routes/polyline.js";
import { bundleDensityRoutes, densityRouteBandwidth } from "../../../../../src/grammar/graph/routes/density.js";
import { prepareDensitySamples, disposeDensitySamples, densitySampleByteBound } from "../../../../../src/grammar/graph/routes/densitySamples.js";
import { routeDensitySamples, createRouteDensityField, createPackedRouteDensityField, advectDensityRoute, advectPackedDensityRoute, routeDensityAt } from "../../../../../src/grammar/graph/routes/densityField.js";
import { routeValueHash } from "../../../../../src/grammar/graph/routes/job.js";
import { denseRouteDensity } from "../../../../oracles/edge-routes.js";

const p = (x, y) => ({ x, y });
const bounds = { x: -1, y: -1, width: 2, height: 2 };
function fixture(directed) {
  const points = [p(-0, 0), p(1, 0), p(0, 0.02), p(1, 0.02)];
  const edges = [{ key: 10, sourceKey: 0, targetKey: 1 }, { key: 2, sourceKey: 3, targetKey: 2 }, { key: 3, sourceKey: 0, targetKey: 0 }];
  const model = normalizeObservedGraph(points.map((_, key) => ({ key })), edges, { directed, selfLoops: true });
  return { model, positions: model.nodes.map((node, i) => ({ key: node.key, ...points[i] })), order: { nodes: [0, 1, 2, 3], edges: [10, 2, 3] } };
}
function resample(routes, bandwidth, budget, held = 0) {
  const counts = routes.map(points => Math.max(2, Math.ceil(routeLength(points) / Math.min(bandwidth / 4, 1 / 256)) + 1));
  const total = counts.reduce((sum, count) => sum + count, 0);
  budget.samples(held + routes.reduce((sum, points) => sum + points.length, 0) + total); budget.charge(total);
  return routes.map((points, i) => resampleRoute(points, counts[i]));
}
function region(routes, bandwidth) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const points of routes) for (const { x, y } of points) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  const side = Math.max(1, right - left, bottom - top);
  return { x: (left + right - side) / 2 - bandwidth, y: (top + bottom - side) / 2 - bandwidth, width: side + 2 * bandwidth, height: side + 2 * bandwidth };
}

test("packed samples preserve exact weights angles offsets signed zero and immutable coordinates", () => {
  const routes = [[p(-0, 0), p(0, -0)], [p(0, 0), p(0, 0), p(1, -1), p(0, 0)], [p(1e-300, -1e-300), p(2e-300, 1e-300)]];
  const before = structuredClone(routes), table = prepareDensitySamples(routes, createRouteBudget());
  assert.deepEqual([...table.offsets], [0, 2, 6, 8]);
  for (let edge = 0; edge < routes.length; edge++) routeDensitySamples(routes[edge]).forEach((sample, i) => {
    assert.ok(Object.is(table.weights[table.offsets[edge] + i], sample.weight));
    assert.ok(Object.is(table.angles[table.offsets[edge] + i], sample.angle));
  });
  assert.equal(table.bytes, 16 * 8 + 4 * 4); assert.equal(table.peakBytes, table.bytes + 3 * 8);
  assert.deepEqual(routes, before); disposeDensitySamples(table); disposeDensitySamples(table);
  assert.deepEqual(table, { weights: undefined, angles: undefined, offsets: undefined, count: 0, bytes: 0, peakBytes: 0 });
  const empty = prepareDensitySamples([], createRouteBudget()); assert.equal(empty.bytes, 4); disposeDensitySamples(empty);
});

test("packed fields retain exact insertion order zero contributions and the independent dense oracle", () => {
  const routes = [[p(-0.5, 0), p(0, 0.25), p(0.5, 0)], [p(0.5, 0), p(0, -0.25), p(-0.5, 0)], [p(0, 0), p(0, 0)]];
  const table = prepareDensitySamples(routes, createRouteBudget()), samples = routes.flatMap(routeDensitySamples);
  try {
    for (const directed of [false, true]) {
      const options = { size: 17, bandwidth: 0.5, directed }, a = createRouteBudget(), b = createRouteBudget();
      const ordinary = createRouteDensityField(samples, bounds, options, a), packed = createPackedRouteDensityField(routes, table, bounds, options, b);
      assert.deepEqual([...packed.cells], [...ordinary.cells]); assert.deepEqual(b.diagnostics(), a.diagnostics());
      routes.forEach((points, edge) => assert.deepEqual(advectPackedDensityRoute(points, table, edge, packed, 0.005), advectDensityRoute(points, routeDensitySamples(points), ordinary, 0.005)));
      if (!directed) {
        const independent = denseRouteDensity(samples, bounds, 17, 0.5);
        for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) assert.ok(Math.abs(routeDensityAt(packed, x, y) - independent[y][x]) < 1e-12);
      }
    }
  } finally { disposeDensitySamples(table); }
  const tiny = [[p(0, 0), p(2 * Number.MIN_VALUE, Number.MIN_VALUE)]];
  const underflow = prepareDensitySamples(tiny, createRouteBudget()), options = { size: 5, bandwidth: 1, directed: true };
  try {
    const field = createPackedRouteDensityField(tiny, underflow, bounds, options, createRouteBudget());
    assert.deepEqual([...field.cells], [...createRouteDensityField(tiny.flatMap(routeDensitySamples), bounds, options, createRouteBudget()).cells]);
    assert.deepEqual([...field.cells].filter(([, value]) => value === 0).map(([key]) => key), [7, 11, 12, 13, 17]);
  } finally { disposeDensitySamples(underflow); }
});

test("all twenty object and packed iterations retain every field coordinate diagnostic and complete hash", () => {
  for (const directed of [false, true]) {
    const input = fixture(directed), before = structuredClone(input), contexts = [prepareRouteInput(input), prepareRouteInput(input)];
    let routes = contexts.map(context => resample(context.edges.map(edge => [edge.source, edge.target]), densityRouteBandwidth(0), context.budget));
    const schedules = [[], []];
    for (let iteration = 0; iteration < 20; iteration++) {
      const bandwidth = densityRouteBandwidth(iteration), count = routes[0].reduce((sum, points) => sum + points.length, 0);
      contexts.forEach(context => { context.budget.samples(count * 6 + context.edges.length * 2); context.budget.charge(count * 24); });
      const samples = routes[0].map(routeDensitySamples), flat = samples.flat(), packed = prepareDensitySamples(routes[1], contexts[1].budget);
      try {
        const options = { bandwidth, size: 256, directed }, box = region(routes[0], bandwidth);
        const fieldBudget = contexts.map(context => ({ charge: context.budget.charge, samples: size => context.budget.samples(size + count * 5 + context.edges.length * 2) }));
        const fields = [createRouteDensityField(flat, box, options, fieldBudget[0]), createPackedRouteDensityField(routes[1], packed, box, options, fieldBudget[1])];
        assert.deepEqual([...fields[1].cells], [...fields[0].cells]);
        const moved = [routes[0].map((points, i) => advectDensityRoute(points, samples[i], fields[0], 0.005)), routes[1].map((points, i) => advectPackedDensityRoute(points, packed, i, fields[1], 0.005))];
        assert.deepEqual(moved[1], moved[0]);
        routes = moved.map((value, i) => resample(value, bandwidth, contexts[i].budget, fields[i].cells.size + count * 3 + contexts[i].edges.length * 2));
        assert.deepEqual(routes[1], routes[0]); assert.deepEqual(contexts[1].budget.diagnostics(), contexts[0].budget.diagnostics());
        schedules.forEach((schedule, i) => schedule.push({ iteration, bandwidth, fieldCells: fields[i].cells.size, samples: routes[i].reduce((sum, points) => sum + points.length, 0) }));
      } finally { disposeDensitySamples(packed); }
    }
    const results = contexts.map((context, i) => {
      const result = finalizeRouteResult(context, "density-v1", context.edges.map((edge, j) => ({ edgeKey: edge.key, points: routes[i][j], ...(edge.source.x === edge.target.x && edge.source.y === edge.target.y ? { reason: "zero-length" } : {}) })));
      return { ...result, options: { zeroLength: "point" }, diagnostics: { ...result.diagnostics, gridSize: 256, step: 0.005, iterations: 20, schedule: schedules[i] } };
    });
    const actual = bundleDensityRoutes(input);
    assert.deepEqual(results[1], results[0]); assert.deepEqual(actual, results[0]);
    assert.equal(routeValueHash(actual), routeValueHash(results[0])); assert.deepEqual(input, before);
  }
});

test("sample-derived reservations precede every allocation and abort or partial failure cannot return buffers", () => {
  assert.equal(densitySampleByteBound(8, 3, 3), 168);
  for (const args of [[-1, 0, 0], [Infinity, 0, 0], [1.5, 0, 0], [2 ** 32, 0, 0], [2, 2, 1], [2, 1, 3]]) assert.throws(() => densitySampleByteBound(...args), /bounded/);
  const routes = [[p(0, 0), p(1, 0)], [p(1, 0), p(0, 0)]], before = structuredClone(routes);
  const Float = globalThis.Float64Array, Uint = globalThis.Uint32Array;
  for (const failure of [1, 2, 3, 4]) for (const mode of ["allocation", "abort"]) {
    let allocations = 0; const controller = new AbortController(), budget = createRouteBudget({}, controller.signal);
    const wrap = Constructor => new Proxy(Constructor, { construct(target, args) {
      allocations++;
      if (allocations === failure && mode === "allocation") throw new RangeError("Allocation rejected");
      const value = new target(...args); if (allocations === failure && mode === "abort") controller.abort(); return value;
    } });
    try {
      globalThis.Float64Array = wrap(Float); globalThis.Uint32Array = wrap(Uint);
      assert.throws(() => prepareDensitySamples(routes, budget), mode === "allocation" ? /Allocation rejected/ : { name: "AbortError" });
      assert.equal(allocations, failure);
    } finally { globalThis.Float64Array = Float; globalThis.Uint32Array = Uint; }
  }
  const controller = new AbortController(); controller.abort(); assert.throws(() => prepareDensitySamples(routes, createRouteBudget({}, controller.signal)), { name: "AbortError" });
  assert.throws(() => prepareDensitySamples(routes, createRouteBudget({ maxSamples: 3 })), /Route active samples/);
  assert.throws(() => prepareDensitySamples([[p(-Number.MAX_VALUE, 0), p(Number.MAX_VALUE, 0)]], createRouteBudget()), /finite/);
  assert.deepEqual(routes, before); const next = prepareDensitySamples(routes, createRouteBudget()); assert.equal(next.count, 4); disposeDensitySamples(next);
});
