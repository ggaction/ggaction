import assert from "node:assert/strict";
import test from "node:test";
import { normalizeObservedGraph } from "../../../../../src/grammar/graph/normalize.js";
import { createRouteBudget } from "../../../../../src/grammar/graph/routes/budget.js";
import { bundleEdgePathRoutes, normalizeEdgePathOptions, smoothRouteCorners } from "../../../../../src/grammar/graph/routes/edgePath.js";
import { shortestRoutePath } from "../../../../../src/grammar/graph/routes/shortestPath.js";
import { getErrorDetails } from "../../../../../src/core/diagnostics.js";

const p = (x, y) => ({ x, y });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);
function fixture({ points = [p(0, 0), p(1, 1), p(2, 0)], edges = [["AC", 0, 2], ["AB", 0, 1], ["BC", 1, 2]], directed = true, weight = 1 } = {}) {
  const model = normalizeObservedGraph(points.map((_, key) => ({ key })), edges.map(([key, sourceKey, targetKey], i) => ({ key, sourceKey, targetKey, weight: weight * (i + 1) })), { directed, selfLoops: true });
  return { model, positions: model.nodes.map((node, index) => ({ key: node.key, ...points[index] })), order: { nodes: points.map((_, index) => index), edges: edges.map(([key]) => key) } };
}
function search(edges, costs, source, target, skip = [], budget = createRouteBudget()) {
  const adjacency = new Map();
  edges.forEach(([from, to], edge) => { if (!adjacency.has(from)) adjacency.set(from, []); if (!adjacency.has(to)) adjacency.set(to, []); adjacency.get(from).push({ edge, target: to }); });
  return shortestRoutePath(adjacency, costs, skip, source, target, budget);
}

test("the literal triangular graph bundles its longest edge through two existing edges and locks them", () => {
  const input = fixture(), before = structuredClone(input), result = bundleEdgePathRoutes(input), [ac, ab, bc] = result.routes;
  assert.deepEqual(result.options, { exponent: 2, maxStretch: 2, zeroLength: "point" });
  assert.deepEqual(ac.controlPoints, [p(0, 0), p(1, 1), p(2, 0)]);
  assert.deepEqual(ac.provenance.pathEdges, [ab.edgeKey, bc.edgeKey]); assert.deepEqual(ac.provenance.pathNodes, input.model.nodes.map(node => node.key));
  near(ac.provenance.originalPathLength, 2 * Math.SQRT2); assert.ok(ac.provenance.routeLength < 2 * Math.SQRT2);
  assert.deepEqual(ac.commands, [{ op: "M", x: 0, y: 0 }, { op: "L", x: 0.75, y: 0.75 }, { op: "L", x: 1.25, y: 0.75 }, { op: "L", x: 2, y: 0 }]);
  assert.equal(ac.provenance.skipped, true); assert.equal(ac.provenance.locked, false);
  for (const route of [ab, bc]) { assert.equal(route.provenance.reason, "locked"); assert.equal(route.provenance.locked, true); assert.equal(route.provenance.skipped, false); }
  assert.deepEqual(result.diagnostics.processingOrder, [ac.edgeKey, ab.edgeKey, bc.edgeKey]);
  assert.deepEqual(result.diagnostics.lockedEdges, [ab.edgeKey, bc.edgeKey]); assert.deepEqual(result.diagnostics.bundledEdges, [ac.edgeKey]);
  assert.deepEqual(input, before); assert.ok(Object.isFrozen(ac.provenance.pathEdges));
  assert.deepEqual(bundleEdgePathRoutes(fixture({ weight: 1000 })).routes, result.routes);
});

test("geometric stretch rejects the alternate path independently of squared cost and restores candidate availability", () => {
  const result = bundleEdgePathRoutes(fixture(), { maxStretch: 1.2 });
  assert.equal(result.routes[0].provenance.reason, "stretch"); assert.equal(result.routes[0].commands.length, 2);
  assert.equal(result.routes[0].provenance.skipped, false); assert.deepEqual(result.diagnostics.bundledEdges, []);
  assert.ok(result.routes.every(route => route.commands.length === 2));
  const disconnected = bundleEdgePathRoutes(fixture({ edges: [["AC", 0, 2], ["AB", 0, 1], ["CB", 2, 1]] }));
  assert.equal(disconnected.routes[0].provenance.reason, "disconnected");
  const undirected = bundleEdgePathRoutes(fixture({ edges: [["AC", 0, 2], ["AB", 0, 1], ["CB", 2, 1]], directed: false }));
  assert.deepEqual(undirected.routes[0].controlPoints, [p(0, 0), p(1, 1), p(2, 0)]);
});

test("raw typed edge keys determine cost ties and source permutation does not change route provenance", () => {
  const points = [p(0, 0), p(1, 1), p(2, 0), p(1, -1)], edges = [[99, 0, 2], [10, 0, 1], [11, 1, 2], [2, 0, 3], [3, 3, 2]];
  const result = bundleEdgePathRoutes(fixture({ points, edges }));
  assert.deepEqual(result.routes[0].provenance.pathEdges, [result.routes[3].edgeKey, result.routes[4].edgeKey]);
  const reversed = bundleEdgePathRoutes(fixture({ points, edges: edges.slice().reverse() }));
  assert.deepEqual(reversed.routes.slice().reverse(), result.routes); assert.deepEqual(reversed.diagnostics, result.diagnostics);
});

test("Dijkstra uses the full key sequence, handles stale heap entries, and excludes skipped edges and zero cycles", () => {
  const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3], [3, 4], [2, 1], [1, 0]];
  assert.deepEqual(search(edges, [1, 1, 1, 1, 9, 1, 0, 0], 0, 4).edges, [0, 2, 5]);
  assert.deepEqual(search(edges, [3, 1, 1, 9, 12, 1, 0, 0], 0, 4).edges, [1, 6, 2, 5]);
  assert.deepEqual(search(edges, [1, 1, 1, 1, 9, 1, 0, 0], 0, 4, [true]).edges, [1, 3, 5]);
  assert.equal(search([...edges, [8, 9]], [3, 1, 1, 9, 12, 1, 0, 0, 1], 0, 9), undefined);
  assert.deepEqual(search(edges, [1, 1, 1, 1, 9, 1, 0, 0], 0, 0), { edges: [], nodes: [0], cost: 0 });
  assert.throws(() => search([[0, 1], [1, 2]], [Number.MAX_VALUE, Number.MAX_VALUE], 0, 2), /finite/);
  assert.throws(() => search(edges, [1, 1, 1, 1, 9, 1, 0, 0], 0, 4, [], createRouteBudget({ maxSamples: 3 })), /samples/);
});

test("point loops, duplicate parallel edges and empty graphs preserve identity without virtual nodes", () => {
  const empty = bundleEdgePathRoutes(fixture({ points: [], edges: [] })); assert.deepEqual(empty.routes, []);
  const self = bundleEdgePathRoutes(fixture({ points: [p(-0, 1)], edges: [[1, 0, 0]] }));
  assert.equal(self.routes[0].provenance.reason, "zero-length"); assert.ok(Object.is(self.routes[0].commands[0].x, -0));
  const parallel = bundleEdgePathRoutes(fixture({ points: [p(0, 0), p(1, 0)], edges: [[1, 0, 1], [2, 0, 1]] }));
  assert.deepEqual(parallel.routes[0].provenance.pathEdges, [parallel.routes[1].edgeKey]);
  assert.equal(parallel.routes[1].provenance.reason, "locked"); assert.equal(parallel.routes[0].commands.length, 2);
  assert.equal(parallel.routes[0].sourceKey, parallel.routes[1].sourceKey); assert.equal(parallel.routes[0].targetKey, parallel.routes[1].targetKey);
});

test("convex corner smoothing keeps endpoint anchors and validates pre/post stretch", () => {
  const points = [p(0, 0), p(1, 1), p(2, 0)], before = structuredClone(points);
  const result = smoothRouteCorners(points, 3, createRouteBudget());
  assert.deepEqual(result.points[0], points[0]); assert.deepEqual(result.points.at(-1), points.at(-1)); assert.ok(result.length <= 3);
  assert.throws(() => smoothRouteCorners(points, 2, createRouteBudget()), /before smoothing/);
  assert.throws(() => smoothRouteCorners(points, 3, createRouteBudget({ maxSamples: 6 })), /samples/);
  assert.deepEqual(points, before);
  const collinear = [p(0, 0), p(1.0626254125963897, 2.633785652462393), p(8.174041635356843, 20.2598896343261)];
  const rounded = smoothRouteCorners(collinear, 21.84669505100534, createRouteBudget());
  assert.equal(rounded.smoothing, 0); assert.equal(rounded.length, 21.84669505100534);
  assert.deepEqual(rounded.points, collinear); assert.notEqual(rounded.points[1], collinear[1]);
});

test("invalid options, cost/world overflow, abort and bounded queues leave original input unchanged", () => {
  const input = fixture(), before = structuredClone(input);
  assert.deepEqual(normalizeEdgePathOptions(), { exponent: 2, maxStretch: 2, zeroLength: "point" });
  for (const options of [null, { extra: 1 }, { exponent: 0 }, { exponent: NaN }, { maxStretch: 0.9 }, { maxStretch: Infinity }, { zeroLength: "loop" }, { get exponent() { throw Error("getter executed"); } }]) assert.throws(() => bundleEdgePathRoutes(input, options));
  const controller = new AbortController(); controller.abort();
  assert.throws(() => bundleEdgePathRoutes(input, {}, controller.signal), { name: "AbortError" });
  const diagonal = fixture({ points: [p(0, 0), p(1, 1)], edges: [[1, 0, 1]] });
  assert.throws(() => bundleEdgePathRoutes(diagonal, { exponent: Number.MAX_VALUE }), /cost.*finite/);
  const giant = fixture({ points: [p(0, 0), p(Number.MAX_VALUE, Number.MAX_VALUE)], edges: [[1, 0, 1]] });
  assert.throws(() => bundleEdgePathRoutes(giant), /length.*finite/);
  const diagonalParallel = fixture({ points: [p(0, 0), p(1, 1)], edges: [[1, 0, 1], [2, 0, 1]] });
  assert.throws(() => bundleEdgePathRoutes(diagonalParallel, { maxStretch: Number.MAX_VALUE }), /stretch.*finite/);
  assert.throws(() => bundleEdgePathRoutes({ ...input, limits: { maxSamples: 10 } }), error => getErrorDetails(error)?.code === "resource-limit");
  assert.deepEqual(input, before);
});
