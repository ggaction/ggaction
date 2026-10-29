import assert from "node:assert/strict";
import test from "node:test";
import { normalizeObservedGraph } from "../../../../../src/grammar/graph/normalize.js";
import { createRouteBudget } from "../../../../../src/grammar/graph/routes/budget.js";
import { resampleRoute } from "../../../../../src/grammar/graph/routes/polyline.js";
import { bundleDensityRoutes, normalizeDensityRouteOptions } from "../../../../../src/grammar/graph/routes/density.js";
import { compactRouteKernel, routeDensitySamples, directionChannels, createRouteDensityField, routeDensityAt, routeGridGradient, sampleRouteGradient, advectDensityRoute } from "../../../../../src/grammar/graph/routes/densityField.js";
import { denseRouteDensity, denseRouteGradient } from "../../../../oracles/edge-routes.js";
import { getErrorDetails } from "../../../../../src/core/diagnostics.js";

const p = (x, y) => ({ x, y });
const near = (a, b, tolerance = 1e-12) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const bounds = { x: -1, y: -1, width: 1.75, height: 1.75 };
function field(samples, options = {}, region = bounds) {
  return createRouteDensityField(samples, region, { size: 8, bandwidth: 1, directed: false, ...options }, createRouteBudget());
}
function fixture({ points = [p(0, 0), p(1, 0), p(0, 0.02), p(1, 0.02)], edges = [[10, 0, 1], [2, 2, 3]], directed = true } = {}) {
  const model = normalizeObservedGraph(points.map((_, key) => ({ key })), edges.map(([key, sourceKey, targetKey]) => ({ key, sourceKey, targetKey })), { directed, selfLoops: true });
  return { model, positions: model.nodes.map((node, index) => ({ key: node.key, ...points[index] })), order: { nodes: points.map((_, index) => index), edges: edges.map(([key]) => key) } };
}

test("compact radial density and its analytic derivative match literal kernel values", () => {
  assert.deepEqual([0, 0.5, 1, 2].map(compactRouteKernel), [1, 0.5625, 0, 0]);
  const delta = 1e-6;
  near((compactRouteKernel(0.5 + delta) - compactRouteKernel(0.5 - delta)) / (2 * delta), -1.5, 1e-9);
  const sample = { x: 0, y: 0, weight: 1, angle: 0 }, actual = field([sample]);
  assert.equal(routeDensityAt(actual, 4, 4), 1); assert.equal(routeDensityAt(actual, 6, 4), 0.5625);
  assert.equal(routeGridGradient(actual, 6, 4).x, -1.375);
  const symmetric = field([{ ...sample, x: -0.5 }, { ...sample, x: 0.5 }]);
  assert.deepEqual(routeGridGradient(symmetric, 4, 4), { x: 0, y: 0 });
});

test("an eight by eight sparse field and all border gradients equal an independent dense scalar oracle", () => {
  const samples = [{ x: -0.5, y: 0, weight: 0.25, angle: 0 }, { x: 0.25, y: 0.25, weight: 0.75, angle: 0 }, { x: 0.5, y: -0.75, weight: 0, angle: 0 }];
  const actual = field(samples), expected = denseRouteDensity(samples, bounds, 8, 1);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    near(routeDensityAt(actual, x, y), expected[y][x]);
    const gradient = routeGridGradient(actual, x, y), oracle = denseRouteGradient(expected, bounds, x, y);
    near(gradient.x, oracle.x); near(gradient.y, oracle.y);
  }
  const point = p(-0.125, 0.125), gradient = sampleRouteGradient(actual, point, 0);
  const corners = [[3, 4], [4, 4], [3, 5], [4, 5]].map(([x, y]) => denseRouteGradient(expected, bounds, x, y));
  near(gradient.x, corners.reduce((sum, value) => sum + value.x / 4, 0));
  near(gradient.y, corners.reduce((sum, value) => sum + value.y / 4, 0));
  assert.deepEqual(sampleRouteGradient(actual, p(-99, -99), 0), routeGridGradient(actual, 0, 0));
  assert.deepEqual(sampleRouteGradient(actual, p(99, 99), 0), routeGridGradient(actual, 7, 7));
});

test("arc-length quadrature conserves line mass across sample counts and handles duplicate or turning samples", () => {
  const line = [p(0, 0), p(3, 4)];
  for (const count of [2, 3, 10, 257]) near(routeDensitySamples(resampleRoute(line, count)).reduce((sum, sample) => sum + sample.weight, 0), 5);
  assert.deepEqual(routeDensitySamples([p(0, 0), p(0, 0)]).map(sample => sample.weight), [0, 0]);
  const turning = routeDensitySamples([p(0, 0), p(1, 0), p(0, 0)]);
  assert.equal(turning[1].angle, Math.PI); assert.deepEqual(turning.map(sample => sample.weight), [0.5, 1, 0.5]);
  assert.throws(() => routeDensitySamples([p(-Number.MAX_VALUE, 0), p(Number.MAX_VALUE, 0)]), /finite/);
});

test("circular tangent channels interpolate at the wrap and exclude the opposite direction", () => {
  assert.deepEqual(directionChannels(0), [[0, 1]]); assert.deepEqual(directionChannels(2 * Math.PI), [[0, 1]]);
  const channels = directionChannels(-Math.PI / 8); assert.deepEqual(channels.map(([channel]) => channel), [7, 0]); channels.forEach(([, weight]) => near(weight, 0.5));
  const sample = { x: 0, y: 0, weight: 1, angle: 0 }, actual = field([sample, { ...sample, angle: Math.PI }], { directed: true });
  near(routeDensityAt(actual, 4, 4, 0), 1); near(routeDensityAt(actual, 4, 4, Math.PI), 1);
  near(routeDensityAt(actual, 4, 4, Math.PI / 2), 0);
  const split = field([{ ...sample, angle: Math.PI / 8 }], { directed: true });
  near(routeDensityAt(split, 4, 4, 0), 1); near(routeDensityAt(split, 4, 4, Math.PI), 0);
  near(routeDensityAt(split, 4, 4, Math.PI / 8), 1);
});

test("advection reads one field, smooths once, clamps to its halo and pins both original endpoints", () => {
  const actual = field([]), points = [p(-0.5, 0), p(0, 0), p(0.5, 0)], samples = routeDensitySamples(points), before = structuredClone(points);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) actual.cells.set(y * 8 + x, y);
  const moved = advectDensityRoute(points, samples, actual, 0.2);
  assert.deepEqual(moved, [points[0], p(0, 0.1), points[2]]);
  assert.deepEqual(advectDensityRoute(points, samples, actual, 100), [points[0], p(0, 0.375), points[2]]);
  assert.deepEqual(advectDensityRoute(points, samples, field([]), 0.2), points);
  assert.deepEqual(points, before);
  actual.cells.set(4 * 8 + 5, Infinity);
  assert.throws(() => advectDensityRoute(points, samples, actual, 0.2), /finite/);
});

test("twenty density iterations produce immutable vector routes with fixed endpoints and a converging parallel gap", () => {
  const input = fixture(), before = structuredClone(input), result = bundleDensityRoutes(input);
  assert.equal(result.complete, true); assert.equal(result.diagnostics.iterations, 20); assert.equal(result.diagnostics.gridSize, 256);
  assert.equal(result.diagnostics.schedule[0].bandwidth, 0.05); assert.equal(result.diagnostics.schedule.at(-1).bandwidth, 2 / 256);
  assert.deepEqual(result.routes.map(route => route.edgeKey), input.model.edges.map(edge => edge.key));
  for (let i = 0; i < result.routes.length; i++) {
    const route = result.routes[i], start = input.positions[i * 2], end = input.positions[i * 2 + 1];
    assert.deepEqual(route.commands[0], { op: "M", x: start.x, y: start.y });
    assert.deepEqual(route.commands.at(-1), { op: "L", x: end.x, y: end.y });
    assert.ok(route.commands.length > 2 && route.commands.length <= 4096);
    assert.ok(route.commands.every(command => Number.isFinite(command.x) && Number.isFinite(command.y)));
  }
  const midpoint = route => route.commands.reduce((best, point) => Math.abs(point.x - 0.5) < Math.abs(best.x - 0.5) ? point : best);
  assert.ok(midpoint(result.routes[1]).y - midpoint(result.routes[0]).y < 0.02);
  assert.deepEqual(input, before); assert.ok(Object.isFrozen(result.routes[0].commands[1]));
  const permuted = bundleDensityRoutes(fixture({ edges: [[2, 2, 3], [10, 0, 1]] }));
  assert.deepEqual(permuted.routes.slice().reverse(), result.routes); assert.deepEqual(permuted.diagnostics, result.diagnostics);
});

test("empty and zero-length routes avoid field work while mixed point routes retain signed-zero anchors", () => {
  const empty = bundleDensityRoutes(fixture({ points: [], edges: [] }));
  assert.deepEqual(empty.routes, []); assert.equal(empty.diagnostics.iterations, 0);
  const self = bundleDensityRoutes(fixture({ points: [p(-0, 9)], edges: [[1, 0, 0]] }));
  assert.equal(self.routes[0].provenance.reason, "zero-length"); assert.equal(self.diagnostics.iterations, 0); assert.ok(Object.is(self.routes[0].commands[0].x, -0));
  const mixed = bundleDensityRoutes(fixture({ points: [p(-0, 0), p(1, 0)], edges: [[1, 0, 1], [2, 0, 0]], directed: false }));
  assert.equal(mixed.routes[1].provenance.reason, "zero-length"); assert.equal(mixed.routes[1].commands.length, 2);
  assert.ok(Object.is(mixed.routes[1].commands[0].x, -0));
  assert.equal(mixed.routes[0].commands[0].y, 0); assert.equal(mixed.routes[0].commands.at(-1).y, 0);
  for (const command of mixed.routes[0].commands) assert.ok(Math.abs(command.y) <= 20 * 0.005);
});

test("descriptor-safe options, native abort, sparse field and cumulative work limits fail atomically", () => {
  const input = fixture(), before = structuredClone(input);
  assert.deepEqual(normalizeDensityRouteOptions(), { zeroLength: "point" });
  for (const options of [null, { extra: 1 }, { zeroLength: "loop" }, { get zeroLength() { throw Error("getter executed"); } }]) assert.throws(() => bundleDensityRoutes(input, options));
  const controller = new AbortController(); controller.abort();
  assert.throws(() => bundleDensityRoutes(input, {}, controller.signal), { name: "AbortError" });
  for (const maxSamples of [2, 1000, 4000]) assert.throws(() => bundleDensityRoutes({ ...input, limits: { maxSamples } }), error => getErrorDetails(error)?.code === "resource-limit");
  assert.throws(() => createRouteDensityField([{ x: 0, y: 0, weight: Infinity, angle: 0 }], bounds, { size: 8, bandwidth: 1, directed: false }, createRouteBudget()), /finite/);
  const many = fixture({ edges: Array.from({ length: 40 }, (_, index) => [index, index % 2 * 2, index % 2 * 2 + 1]) });
  assert.throws(() => bundleDensityRoutes(many), error => getErrorDetails(error)?.code === "resource-limit");
  assert.deepEqual(input, before);
});
