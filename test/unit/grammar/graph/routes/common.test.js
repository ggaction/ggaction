import assert from "node:assert/strict";
import test from "node:test";
import { normalizeObservedGraph } from "../../../../../src/grammar/graph/normalize.js";
import { prepareRouteInput, finalizeRouteResult } from "../../../../../src/grammar/graph/routes/common.js";
import { createRouteBudget, normalizeRouteLimits, ROUTE_LIMITS } from "../../../../../src/grammar/graph/routes/budget.js";
import { MAX_ROUTE_POINTS, resampleRoute, routeLength } from "../../../../../src/grammar/graph/routes/polyline.js";
import { getErrorDetails } from "../../../../../src/core/diagnostics.js";

const point = (x, y) => ({ x, y });
const graph = (keys = [10, 2, "2"], edgeKeys = [20, 3], edges = [[10, 2], [2, "2"]], directed = true) => {
  const model = normalizeObservedGraph(keys.map(key => ({ key })), edges.map(([sourceKey, targetKey], i) => ({ key: edgeKeys[i], sourceKey, targetKey, weight: i + 2 })), { directed, selfLoops: true });
  return {
    model, order: { nodes: keys, edges: edgeKeys },
    positions: model.nodes.map((node, index) => ({ key: node.key, x: index * 10 + 100, y: index * 5 - 30 }))
  };
};
const straight = context => context.edges.map(edge => ({ edgeKey: edge.key, points: [edge.source, edge.target] }));
const finish = input => { const context = prepareRouteInput(input); return finalizeRouteResult(context, "straight@1", straight(context)); };
const close = (a, b) => assert.ok(Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test("route work sorts typed keys while output retains graph order, topology and exact endpoints", () => {
  const input = graph(), before = structuredClone(input), context = prepareRouteInput(input);
  assert.deepEqual(context.nodes.map(node => node.key), [input.model.nodes[1].key, input.model.nodes[0].key, input.model.nodes[2].key]);
  assert.deepEqual(context.edges.map(edge => edge.key), [input.model.edges[1].key, input.model.edges[0].key]);
  assert.deepEqual(context.frame, { x: 100, y: -30, scale: 20 });
  const routes = straight(context), result = finalizeRouteResult(context, "straight@1", routes);
  assert.equal(result.complete, true);
  assert.deepEqual(result.routes.map(route => route.edgeKey), input.model.edges.map(edge => edge.key));
  assert.deepEqual(result.routes[0].commands, [{ op: "M", x: 100, y: -30 }, { op: "L", x: 110, y: -25 }]);
  assert.deepEqual(result.routes[1].bounds, { left: 110, right: 120, top: -25, bottom: -20 });
  assert.deepEqual(result.routes[0].provenance, { algorithmVersion: "straight@1" });
  assert.deepEqual(input, before);
  assert.ok(Object.isFrozen(result.routes[0].controlPoints[0]));
  input.positions[0].x = 999;
  routes[0].points = [point(4, 4), point(5, 5)];
  assert.equal(result.routes[0].commands[0].x, 100);
  assert.deepEqual(context.model, before.model);
});

test("route ordering covers raw scalar and tuple identity without decoding opaque tokens", () => {
  const keys = [[1, "b"], "a", 12n, true, new Date(0), 2, [1, "a"]];
  const input = graph(keys, [], []), context = prepareRouteInput(input);
  assert.deepEqual(context.nodes.map(node => input.model.nodes.findIndex(original => original.key === node.key)), [3, 5, 2, 1, 4, 6, 0]);
  const reversed = { ...input, positions: input.positions.slice().reverse() };
  assert.deepEqual(prepareRouteInput(reversed).nodes, context.nodes);
  assert.deepEqual(finalizeRouteResult(context, "empty@1", []).routes, []);
});

test("empty, collapsed, parallel and self routes preserve explicit point fallbacks and signed zero", () => {
  const empty = graph([], [], []);
  assert.deepEqual(prepareRouteInput(empty).frame, { x: 0, y: 0, scale: 1 });
  assert.equal(finish(empty).routes.length, 0);
  const input = graph(["a", "b"], ["self", "parallel1", "parallel2"], [["a", "a"], ["a", "b"], ["a", "b"]], false);
  input.positions.forEach(position => { position.x = -0; position.y = 8; });
  const context = prepareRouteInput(input);
  assert.deepEqual(context.frame, { x: -0, y: 8, scale: 1 });
  const result = finalizeRouteResult(context, "point@1", straight(context).map(route => ({ ...route, reason: "zero-length" })));
  assert.equal(result.routes.length, 3);
  for (const route of result.routes) {
    assert.equal(route.provenance.reason, "zero-length");
    assert.ok(Object.is(route.commands[0].x, -0) && Object.is(route.commands.at(-1).x, -0));
    assert.deepEqual(route.bounds, { left: -0, right: -0, top: 8, bottom: 8 });
  }
});

test("arc length resampling preserves corners at literal distances, repeated points and endpoint identity", () => {
  const points = [point(0, 0), point(0, 0), point(3, 0), point(3, 4)];
  assert.equal(routeLength(points), 7);
  const sampled = resampleRoute(points, 8);
  assert.deepEqual(sampled, [point(0, 0), point(1, 0), point(2, 0), point(3, 0), point(3, 1), point(3, 2), point(3, 3), point(3, 4)]);
  assert.notEqual(sampled[0], points[0]);
  assert.deepEqual(resampleRoute(points, 2), [point(0, 0), point(3, 4)]);
  assert.deepEqual(resampleRoute([point(-0, 2), point(-0, 2)], 4), [point(-0, 2), point(0, 2), point(0, 2), point(-0, 2)]);
  for (const count of [3, 9, 100, 4097]) {
    const line = resampleRoute([point(-4, 3), point(8, 19)], count);
    line.forEach((p, i) => { close(p.x, -4 + 12 * i / (count - 1)); close(p.y, 3 + 16 * i / (count - 1)); });
    close(routeLength(line), 20);
  }
});

test("sample and pair budgets reject before output without changing prior successful results", () => {
  assert.deepEqual(normalizeRouteLimits(), ROUTE_LIMITS);
  const budget = createRouteBudget({ maxCandidatePairs: 2, maxSamples: 4 });
  budget.pairs(2); budget.samples(4); budget.charge(8);
  const before = budget.diagnostics();
  assert.deepEqual(before, { work: 10, candidatePairs: 2, peakSamples: 4 });
  for (const run of [() => budget.pairs(1), () => budget.samples(5), () => budget.charge(10_000_000)]) assert.throws(run, error => getErrorDetails(error)?.code === "resource-limit");
  assert.deepEqual(budget.diagnostics(), before);
  for (const value of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    for (const method of ["charge", "pairs", "samples"]) assert.throws(() => budget[method](value), /safe integer/);
  }
  for (const limits of [null, { extra: 1 }, { maxNodes: 0 }, { maxEdges: null }, { maxSamples: 1.5 }, { maxCandidatePairs: 10_000_001 }]) assert.throws(() => createRouteBudget(limits));
  const input = graph(), snapshot = structuredClone(input);
  assert.throws(() => prepareRouteInput({ ...input, limits: { maxSamples: 3 } }), /active samples/);
  const context = prepareRouteInput({ ...input, limits: { maxSamples: 4 } });
  assert.throws(() => finalizeRouteResult(context, "straight@1", straight(context)), /active samples/);
  assert.deepEqual(input, snapshot);
});

test("native abort is checked at preparation, repeated work and finalization without invoking user properties", () => {
  const controller = new AbortController(), input = graph();
  const context = prepareRouteInput(input, controller.signal);
  controller.abort();
  for (const run of [() => prepareRouteInput(input, controller.signal), () => context.budget.check(), () => context.budget.charge(1), () => context.budget.samples(1), () => finalizeRouteResult(context, "straight@1", straight(context))]) assert.throws(run, { name: "AbortError" });
  let calls = 0;
  assert.throws(() => createRouteBudget({}, { get aborted() { calls++; return false; }, throwIfAborted() { calls++; } }));
  assert.equal(calls, 0);
  const emptyController = new AbortController(), empty = prepareRouteInput(graph([], [], []), emptyController.signal);
  emptyController.abort();
  assert.throws(() => finalizeRouteResult(empty, "empty@1", []), { name: "AbortError" });
});

test("route input rejects incomplete positions, duplicate typed identities, unsafe descriptors and overflow", () => {
  const original = graph(), before = structuredClone(original);
  const mutations = [
    input => { input.extra = true; }, input => { input.order.extra = 1; },
    input => { delete input.model; }, input => { delete input.order.nodes; },
    input => { input.order.nodes = [1, 1, 2]; }, input => { input.order.edges = [1]; },
    input => { input.order.nodes = null; }, input => { input.order.nodes = [null, 2, 3]; },
    input => { input.positions = input.positions.slice(1); }, input => { input.positions = null; },
    input => { input.positions[0].key = "missing"; }, input => { input.positions[0].key = input.positions[1].key; },
    input => { input.positions[0].x = NaN; }, input => { delete input.positions[0].y; },
    input => { input.positions[0].extra = 1; }, input => { input.positions = Array(3); },
    input => { input.positions[0].x = -Number.MAX_VALUE; input.positions[1].x = Number.MAX_VALUE; }
  ];
  for (const mutate of mutations) { const input = structuredClone(original); mutate(input); assert.throws(() => prepareRouteInput(input)); }
  let calls = 0;
  for (const property of ["model", "positions", "order", "limits"]) {
    const input = { ...original, get [property]() { calls++; return original[property]; } };
    assert.throws(() => prepareRouteInput(input), /accessors/);
  }
  assert.equal(calls, 0);
  assert.deepEqual(original, before);
});

test("route finalization rejects partial, duplicate, moved or nonfinite geometry before publishing a result", () => {
  const context = prepareRouteInput(graph()), routes = straight(context), before = structuredClone(routes);
  for (const version of [null, "", 1]) assert.throws(() => finalizeRouteResult(context, version, routes));
  for (const candidates of [null, [], [{}, routes[1]], [routes[0], routes[0]], [{ ...routes[0], edgeKey: "missing" }, routes[1]], [{ ...routes[0], complete: false }, routes[1]], [{ ...routes[0], reason: "" }, routes[1]]]) assert.throws(() => finalizeRouteResult(context, "v1", candidates));
  for (const points of [[], [point(0, 0)], [point(0, 0), point(Infinity, 1)], [point(99, 99), routes[0].points[1]], Array(MAX_ROUTE_POINTS + 1), [point(0, 0), { x: 1, y: 1, extra: true }]]) assert.throws(() => finalizeRouteResult(context, "v1", [{ ...routes[0], points }, routes[1]]));
  const controlPoints = [routes[0].points[0], point(0.2, 0.3), routes[0].points[1]];
  const result = finalizeRouteResult(context, "v1", [{ ...routes[0], controlPoints }, routes[1]]);
  assert.equal(result.routes[1].controlPoints.length, 3);
  const extreme = graph(); extreme.positions.forEach((p, i) => { p.x = i * 5e307; });
  const large = prepareRouteInput(extreme), invalid = straight(large);
  invalid[0].points = [invalid[0].points[0], point(4, 0), invalid[0].points[1]];
  assert.throws(() => finalizeRouteResult(large, "v1", invalid), /Restored/);
  assert.deepEqual(routes, before);
});

test("resampling rejects malformed, sparse, unsafe and overflowing paths without normalizing invalid input", () => {
  for (const points of [null, [], Array(2), [point(0, 0), { x: 1 }], [point(0, 0), point(NaN, 1)], [point(-Number.MAX_VALUE, 0), point(Number.MAX_VALUE, 0)]]) assert.throws(() => routeLength(points));
  for (const count of [0, 1, 2.5, Infinity, MAX_ROUTE_POINTS + 1]) assert.throws(() => resampleRoute([point(0, 0), point(1, 1)], count));
  let calls = 0;
  assert.throws(() => routeLength([point(0, 0), { get x() { calls++; return 1; }, y: 1 }]), /accessors/);
  assert.equal(calls, 0);
});
