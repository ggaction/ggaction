import assert from "node:assert/strict";
import test from "node:test";
import { normalizeObservedGraph } from "../../../../../src/grammar/graph/normalize.js";
import { forceEdgeMetric, forceCompatibility } from "../../../../../src/grammar/graph/routes/compatibility.js";
import { advanceForceRoutes, bundleForceDirectedRoutes, normalizeForceRouteOptions } from "../../../../../src/grammar/graph/routes/forceDirected.js";
import { getErrorDetails } from "../../../../../src/core/diagnostics.js";

const p = (x, y) => ({ x, y });
const metric = (...points) => forceEdgeMetric(points);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);
function fixture({ points = [p(0, 0), p(1, 0), p(0, 0.1), p(1, 0.1)], edges = [[10, 0, 1], [2, 2, 3]], directed = true } = {}) {
  const model = normalizeObservedGraph(points.map((_, key) => ({ key })), edges.map(([key, sourceKey, targetKey]) => ({ key, sourceKey, targetKey, weight: key })), { directed, selfLoops: true });
  return { model, positions: model.nodes.map((node, index) => ({ key: node.key, ...points[index] })), order: { nodes: points.map((_, i) => i), edges: edges.map(([key]) => key) } };
}
const neighbor = (edge, compatibility, reverse = false) => ({ edge, compatibility, reverse });

test("literal force compatibility factors match parallel, unequal, perpendicular and distant edges", () => {
  const a = metric(p(0, 0), p(1, 0)), b = metric(p(0, 0.1), p(1, 0.1));
  const result = forceCompatibility(a, b, true);
  assert.deepEqual({ ...result, position: 0, compatibility: 0 }, { angle: 1, scale: 1, position: 0, visibility: 1, compatibility: 0, reverse: false });
  close(result.position, 10 / 11); close(result.compatibility, 10 / 11);
  const unequal = forceCompatibility(a, metric(p(-0.5, 0.1), p(1.5, 0.1)), false);
  close(unequal.scale, 12 / 17); close(unequal.position, 15 / 16); close(unequal.visibility, 1);
  assert.equal(forceCompatibility(a, metric(p(0.5, -1), p(0.5, 1)), false).compatibility, 0);
  assert.equal(forceCompatibility(a, metric(p(2, 0), p(3, 0)), false).visibility, 0);
  assert.equal(forceCompatibility(a, metric(p(0, 0), p(0, 0)), false).compatibility, 0);
  assert.equal(forceCompatibility(a, metric(p(0, 0), p(1e-10, 0)), false).compatibility, 0);
  assert.ok(Object.isFrozen(a.source));
});

test("direction changes compatibility and reverses undirected sample correspondence explicitly", () => {
  const a = metric(p(0, 0), p(1, 0)), b = metric(p(1, 0.2), p(0, 0.2));
  assert.equal(forceCompatibility(a, b, true).compatibility, 0);
  const pair = forceCompatibility(a, b, false);
  assert.equal(pair.reverse, true); close(pair.compatibility, 5 / 6);
  const routes = [[p(0, 0), p(1 / 3, 0), p(2 / 3, 0), p(1, 0)], [p(1, 0.2), p(2 / 3, 0.2), p(1 / 3, 0.2), p(0, 0.2)]];
  const next = advanceForceRoutes(routes, [1, 1], [[neighbor(1, pair.compatibility, true)], [neighbor(0, pair.compatibility, true)]], 0.001);
  routes.forEach((points, edge) => points.forEach((point, index) => close(next.routes[edge][index].x, point.x)));
  assert.ok(next.routes[0][1].y > 0 && next.routes[1][1].y < 0.2);
});

test("the first simultaneous step matches literal spring and attraction values without capping", () => {
  const routes = [[p(0, 0), p(0.5, 0), p(1, 0)], [p(0, 2 / 3), p(0.5, 2 / 3), p(1, 2 / 3)]];
  const before = structuredClone(routes);
  const next = advanceForceRoutes(routes, [1, 1], [[neighbor(1, 3 / 5)], [neighbor(0, 3 / 5)]], 0.1);
  close(next.routes[0][1].y, 9 / 100); close(next.routes[1][1].y, 2 / 3 - 9 / 100);
  assert.equal(next.displacementCaps, 0);
  assert.deepEqual(routes, before);
  assert.notEqual(next.routes[0][0], routes[0][0]);
  const spring = advanceForceRoutes([[p(0, 0), p(0.5, 0.2), p(1, 0)]], [1], [[]], 0.1);
  close(spring.routes[0][1].y, 0.198);
});

test("coincident samples exert zero attraction and the displacement cap is counted", () => {
  const line = [p(0, 0), p(0.5, 0), p(1, 0)], neighbors = [[neighbor(1, 1)], [neighbor(0, 1)]];
  const coincident = advanceForceRoutes([line, line], [1, 1], neighbors, 0.1);
  assert.deepEqual(coincident.routes, [line, line]); assert.equal(coincident.displacementCaps, 0);
  const nearby = line.map(point => p(point.x, point.y + 0.1));
  const capped = advanceForceRoutes([line, nearby], [1, 1], neighbors, 0.1);
  assert.equal(capped.displacementCaps, 2); close(capped.routes[0][1].y, 0.1); close(capped.routes[1][1].y, 0);
  assert.throws(() => advanceForceRoutes([line, nearby], [1, 1], neighbors, Infinity), /finite/);
});

test("the full fixed schedule preserves endpoints, original edge order, input state and determinism", () => {
  const input = fixture(), before = structuredClone(input), result = bundleForceDirectedRoutes(input);
  assert.deepEqual(result.options, { compatibilityThreshold: 0.6, zeroLength: "point" });
  assert.deepEqual(result.diagnostics.schedule.map(c => [c.internalSamples, c.iterations, c.step]), [[1, 60, 0.1], [2, 40, 0.05], [4, 27, 0.025], [8, 18, 0.0125], [16, 12, 0.00625], [32, 8, 0.003125]]);
  assert.equal(result.diagnostics.totalIterations, 165); assert.equal(result.diagnostics.compatibilityPairs, 1);
  assert.ok(result.diagnostics.displacementCaps > 0);
  assert.deepEqual(result.routes.map(route => route.edgeKey), input.model.edges.map(edge => edge.key));
  result.routes.forEach((route, index) => {
    assert.equal(route.commands.length, 34); assert.equal(route.provenance.compatibilityCount, 1);
    assert.deepEqual(route.commands[0], { op: "M", ...[p(0, 0), p(0, 0.1)][index] });
    assert.deepEqual(route.commands.at(-1), { op: "L", ...[p(1, 0), p(1, 0.1)][index] });
    assert.ok(route.commands.every(command => Number.isFinite(command.x) && Number.isFinite(command.y)));
  });
  assert.deepEqual(bundleForceDirectedRoutes(input), result);
  assert.deepEqual(input, before);
  input.positions[0].x = 99;
  assert.equal(result.routes[0].commands[0].x, 0);
  assert.ok(Object.isFrozen(result.routes[0].commands[1]));
});

test("typed work order makes source edge permutation irrelevant to accumulated forces", () => {
  const points = [p(0, 0), p(1, 0), p(0, 0.1), p(1, 0.1), p(0, 0.2), p(1, 0.2)];
  const first = bundleForceDirectedRoutes(fixture({ points, edges: [[10, 0, 1], [2, 2, 3], [4, 4, 5]] }));
  const second = bundleForceDirectedRoutes(fixture({ points, edges: [[4, 4, 5], [2, 2, 3], [10, 0, 1]] }));
  assert.deepEqual(second.routes.slice().reverse(), first.routes);
  assert.deepEqual(second.diagnostics, first.diagnostics);
});

test("empty, self and below-epsilon routes retain exact anchors and explicit fallback reasons", () => {
  const empty = bundleForceDirectedRoutes(fixture({ points: [], edges: [] }));
  assert.deepEqual(empty.routes, []); assert.equal(empty.diagnostics.totalIterations, 0);
  const self = bundleForceDirectedRoutes(fixture({ points: [p(-0, 9)], edges: [[1, 0, 0]] }));
  assert.equal(self.routes[0].provenance.reason, "zero-length"); assert.equal(self.diagnostics.totalIterations, 0);
  assert.ok(Object.is(self.routes[0].commands[0].x, -0));
  const mixed = bundleForceDirectedRoutes(fixture({ points: [p(0, 0), p(1e-12, 0), p(1, 0), p(2, 0)], edges: [[1, 0, 1], [2, 2, 3], [3, 0, 0]] }));
  assert.equal(mixed.routes[0].provenance.reason, "below-epsilon"); assert.equal(mixed.routes[0].commands.at(-1).x, 1e-12);
  assert.equal(mixed.routes[2].provenance.reason, "zero-length"); assert.equal(mixed.routes[2].commands.length, 2);
  assert.equal(mixed.diagnostics.compatibilityPairs, 0);
});

test("threshold zero does not invent perpendicular pairs or merge opposite directed edges", () => {
  const perpendicular = fixture({ points: [p(0, 0), p(1, 0), p(0.5, -0.5), p(0.5, 0.5)] });
  assert.equal(bundleForceDirectedRoutes(perpendicular, { compatibilityThreshold: 0 }).diagnostics.compatibilityPairs, 0);
  const reversed = { edges: [[10, 0, 1], [2, 3, 2]] };
  assert.equal(bundleForceDirectedRoutes(fixture(reversed)).diagnostics.compatibilityPairs, 0);
  assert.equal(bundleForceDirectedRoutes(fixture({ ...reversed, directed: false })).diagnostics.compatibilityPairs, 1);
  assert.equal(bundleForceDirectedRoutes(fixture(), { compatibilityThreshold: 1 }).diagnostics.compatibilityPairs, 0);
});

test("malformed options, overflowing factors, aborts and stage budgets reject without changing source", () => {
  const input = fixture(), before = structuredClone(input);
  for (const options of [null, { extra: 1 }, { compatibilityThreshold: -1 }, { compatibilityThreshold: 1.1 }, { compatibilityThreshold: NaN }, { compatibilityThreshold: null }, { zeroLength: "loop" }]) assert.throws(() => bundleForceDirectedRoutes(input, options));
  assert.deepEqual(normalizeForceRouteOptions(), { compatibilityThreshold: 0.6, zeroLength: "point" });
  assert.throws(() => forceEdgeMetric([p(0, 0), p(1, 1), p(2, 2)]), /exactly two/);
  assert.throws(() => forceEdgeMetric([p(-Number.MAX_VALUE, 0), p(Number.MAX_VALUE, 0)]), /finite/);
  const a = metric(p(0, 0), p(1, 0));
  assert.throws(() => forceCompatibility(a, a), /direction/);
  const large = metric(p(0, 0), p(1e308, 0));
  assert.throws(() => forceCompatibility(large, large, true), /finite/);
  const controller = new AbortController(); controller.abort();
  assert.throws(() => bundleForceDirectedRoutes(input, {}, controller.signal), { name: "AbortError" });
  assert.throws(() => bundleForceDirectedRoutes({ ...input, limits: { maxSamples: 10 } }), /samples/);
  const multiple = fixture({ points: [p(0, 0), p(1, 0)], edges: Array.from({ length: 150 }, (_, i) => [i, 0, 1]) });
  const snapshot = structuredClone(multiple);
  for (const limits of [{ maxCandidatePairs: 2 }, {}]) assert.throws(() => bundleForceDirectedRoutes({ ...multiple, limits }), error => getErrorDetails(error)?.code === "resource-limit");
  assert.deepEqual(multiple, snapshot); assert.deepEqual(input, before);
});
