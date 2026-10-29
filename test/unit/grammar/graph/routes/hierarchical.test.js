import assert from "node:assert/strict";
import test from "node:test";
import { normalizeObservedGraph } from "../../../../../src/grammar/graph/normalize.js";
import { normalizeHierarchyNodes } from "../../../../../src/grammar/hierarchy/normalize.js";
import { bundleHierarchicalRoutes, normalizeHierarchicalRouteOptions } from "../../../../../src/grammar/graph/routes/hierarchical.js";
import { sampleClampedSpline } from "../../../../../src/grammar/graph/routes/spline.js";
import { createRouteBudget } from "../../../../../src/grammar/graph/routes/budget.js";
import { getErrorDetails } from "../../../../../src/core/diagnostics.js";
import { hierarchyPath, clampedSplinePoint, polylineDistance } from "../../../../oracles/edge-routes.js";

const point = (x, y) => ({ x, y });
const parents = { root: null, A: "root", s: "A", u: "A", B: "root", t: "B" };
const anchors = { root: point(0, 3), A: point(-1, 2), s: point(-2, 0), u: point(-0.5, 0), B: point(1, 2), t: point(2, 0) };
function fixture({ nodeKeys = ["s", "t", "u"], edges = [["st", "s", "t"], ["su", "s", "u"]], positions = anchors, hierarchyParents = parents, forest = false } = {}) {
  const model = normalizeObservedGraph(nodeKeys.map(key => ({ key })), edges.map(([key, sourceKey, targetKey]) => ({ key, sourceKey, targetKey })), { directed: true, selfLoops: true });
  const hierarchyRows = Object.entries(hierarchyParents).map(([key, parentKey]) => ({ key, parentKey, value: 1 }));
  const hierarchy = normalizeHierarchyNodes(hierarchyRows, { forest });
  const graphTokens = new Map(nodeKeys.map((key, i) => [key, model.nodes[i].key]));
  const hierarchyTokens = new Map(hierarchy.nodes.filter(node => !node.synthetic).map(node => [hierarchyRows[node.sourceRows[0]].key, node.key]));
  return {
    route: { model, positions: nodeKeys.map(key => ({ key: graphTokens.get(key), ...positions[key] })), order: { nodes: nodeKeys, edges: edges.map(edge => edge[0]) } },
    hierarchy: { model: hierarchy, mapping: nodeKeys.map(key => ({ nodeKey: graphTokens.get(key), hierarchyKey: hierarchyTokens.get(key) })), positions: hierarchy.nodes.map(node => ({ key: node.key, ...(node.synthetic ? positions.synthetic : positions[hierarchyRows[node.sourceRows[0]].key]) })) },
    hierarchyTokens
  };
}
const run = (f, options) => bundleHierarchicalRoutes(f.route, f.hierarchy, options);
const points = route => route.commands.map(({ x, y }) => ({ x, y }));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test("literal hierarchy paths contain the LCA once and omit unrelated ancestors", () => {
  assert.deepEqual(hierarchyPath(parents, "s", "t"), ["s", "A", "root", "B", "t"]);
  assert.deepEqual(hierarchyPath(parents, "s", "u"), ["s", "A", "u"]);
  assert.throws(() => hierarchyPath({ a: null, b: null }, "a", "b"), /common ancestor/);
  const f = fixture(), before = structuredClone({ route: f.route, hierarchy: f.hierarchy });
  const result = run(f, { strength: 1 });
  assert.equal(result.complete, true);
  for (const [index, target] of ["t", "u"].entries()) {
    const route = result.routes[index], expected = hierarchyPath(parents, "s", target);
    assert.deepEqual(route.provenance.hierarchyKeys, expected.map(key => f.hierarchyTokens.get(key)));
    assert.deepEqual(route.controlPoints, expected.map(key => anchors[key]));
    assert.deepEqual(route.commands[0], { op: "M", ...anchors.s });
    assert.deepEqual(route.commands.at(-1), { op: "L", ...anchors[target] });
    assert.equal(route.provenance.splineVersion, "clamped-uniform@1");
    assert.equal(route.provenance.degree, index === 0 ? 3 : 2);
  }
  assert.deepEqual({ route: f.route, hierarchy: f.hierarchy }, before);
  assert.ok(Object.isFrozen(result.routes[0].provenance.hierarchyKeys));
  f.hierarchy.positions[0].y = 900;
  assert.deepEqual(result.routes[0].controlPoints[2], point(0, 3));
});

test("clamped curves agree with independent basis functions and normalized error bounds", () => {
  const literal = [point(-2, 0), point(-1, 2), point(0, 3), point(1, 2), point(2, 0)];
  assert.deepEqual(clampedSplinePoint(literal, 0.5), point(0, 2.5));
  assert.deepEqual(clampedSplinePoint([point(0, 0), point(0, 1), point(1, 1), point(1, 0)], 0.5), point(0.5, 0.75));
  const f = fixture();
  for (const strength of [0.2, 0.85, 1]) {
    const result = run(f, { strength, tolerance: 0.0001 });
    for (const route of result.routes) for (let i = 0; i <= 1000; i++) {
      assert.ok(polylineDistance(clampedSplinePoint(route.controlPoints, i / 1000), points(route)) <= 4 * 0.0001 + 1e-12);
    }
  }
  for (const controls of [[point(0, 0), point(2, 1)], [point(0, 0), point(1, 1), point(2, 0)], [point(0, 0), point(0, 1), point(1, 1), point(1, 0)]]) {
    const sampled = sampleClampedSpline(controls, {}, createRouteBudget());
    assert.equal(sampled.degree, controls.length - 1);
    for (let i = 0; i <= 100; i++) assert.ok(polylineDistance(clampedSplinePoint(controls, i / 100), sampled.points) <= 0.001 + 1e-12);
  }
  const many = [point(0, 0), point(0, 1), point(1, 2), point(2, -1), point(3, 1), point(4, 0)];
  const sampled = sampleClampedSpline(many, {}, createRouteBudget());
  for (let i = 0; i <= 1000; i++) assert.ok(polylineDistance(clampedSplinePoint(many, i / 1000), sampled.points) <= 0.001 + 1e-12);
});

test("strength zero is exact straight geometry while retaining the validated hierarchy path", () => {
  const result = run(fixture(), { strength: 0, maxSubdivisions: 1 });
  assert.deepEqual(result.routes[0].commands, [{ op: "M", x: -2, y: 0 }, { op: "L", x: 2, y: 0 }]);
  assert.deepEqual(result.routes[0].controlPoints, [-2, -1, 0, 1, 2].map(x => point(x, 0)));
  assert.deepEqual(normalizeHierarchicalRouteOptions(), { strength: 0.85, zeroLength: "point", tolerance: 0.001, maxSubdivisions: 4096 });
  assert.equal(result.routes[0].provenance.hierarchyKeys.length, 5);
});

test("hierarchical routes are invariant to source order and affine translation or uniform scale", () => {
  const original = run(fixture(), { strength: 1 });
  const reordered = run(fixture({ nodeKeys: ["u", "s", "t"], edges: [["su", "s", "u"], ["st", "s", "t"]] }), { strength: 1 });
  assert.deepEqual(reordered.routes.slice().reverse(), original.routes);
  const shifted = Object.fromEntries(Object.entries(anchors).map(([key, p]) => [key, point(p.x * 100 + 45, p.y * 100 - 9)]));
  const transformed = run(fixture({ positions: shifted }), { strength: 1 });
  transformed.routes.forEach((route, index) => route.commands.forEach((p, i) => { close(p.x, original.routes[index].commands[i].x * 100 + 45); close(p.y, original.routes[index].commands[i].y * 100 - 9); }));
});

test("empty graphs, explicit synthetic forest roots and point self routes retain original identity", () => {
  const empty = fixture({ nodeKeys: [], edges: [], positions: {}, hierarchyParents: {} });
  assert.deepEqual(run(empty).routes, []);
  const forest = fixture({ nodeKeys: ["a", "b"], edges: [["ab", "a", "b"]], hierarchyParents: { a: null, b: null }, positions: { a: point(-1, 0), b: point(1, 0), synthetic: point(0, 1) }, forest: true });
  const route = run(forest, { strength: 1 }).routes[0];
  assert.equal(route.provenance.hierarchyKeys.length, 3);
  assert.equal(route.provenance.hierarchyKeys[1], forest.hierarchy.model.rootKey);
  assert.equal(forest.route.model.nodes.length, 2);
  assert.throws(() => normalizeHierarchyNodes([{ key: "a", parentKey: null }, { key: "b", parentKey: null }]), /root|forest/);
  const self = run(fixture({ nodeKeys: ["s"], edges: [["ss", "s", "s"]] })).routes[0];
  assert.deepEqual(self.controlPoints, [anchors.s, anchors.s]);
  assert.equal(self.provenance.reason, "zero-length");
  assert.equal(self.provenance.hierarchyKeys.length, 1);
});

test("hierarchical authoring rejects missing mappings, internal anchors and mismatched endpoints even at strength zero", () => {
  const f = fixture(), before = structuredClone(f);
  const mutations = [
    x => { x.extra = 1; }, x => { delete x.mapping; }, x => { x.mapping = []; }, x => { x.mapping[0] = {}; },
    x => { x.mapping[0].nodeKey = "unknown"; }, x => { x.mapping[0].hierarchyKey = "missing"; },
    x => { x.mapping[1] = { ...x.mapping[0] }; }, x => { x.mapping[0].extra = true; },
    x => { x.positions = x.positions.slice(1); }, x => { x.positions[0] = {}; },
    x => { x.positions[1] = { ...x.positions[0] }; }, x => { x.positions[0].x = Infinity; },
    x => { x.positions[0].extra = true; }, x => { x.positions[2].x += 1; }
  ];
  for (const mutate of mutations) { const input = structuredClone(f.hierarchy); mutate(input); assert.throws(() => bundleHierarchicalRoutes(f.route, input, { strength: 0 })); }
  let calls = 0;
  assert.throws(() => bundleHierarchicalRoutes(f.route, { ...f.hierarchy, get model() { calls++; return f.hierarchy.model; } }), /accessors/);
  assert.equal(calls, 0);
  assert.deepEqual(f, before);
});

test("spline limits, finite calculations and aborts fail atomically instead of accepting partial curves", () => {
  const f = fixture(), before = structuredClone(f);
  for (const options of [null, { extra: 1 }, { strength: -1 }, { strength: 1.1 }, { strength: NaN }, { strength: null }, { zeroLength: "loop" }, { tolerance: 0 }, { tolerance: Infinity }, { tolerance: null }, { maxSubdivisions: 0 }, { maxSubdivisions: 1.5 }, { maxSubdivisions: 4097 }]) assert.throws(() => run(f, options));
  for (const options of [{ strength: 1, maxSubdivisions: 1 }, { strength: 1, tolerance: 1e-15 }]) assert.throws(() => run(f, options), error => getErrorDetails(error)?.code === "resource-limit");
  assert.throws(() => bundleHierarchicalRoutes({ ...f.route, limits: { maxSamples: 8 } }, f.hierarchy), /samples/);
  const controller = new AbortController(); controller.abort();
  assert.throws(() => bundleHierarchicalRoutes(f.route, f.hierarchy, {}, controller.signal), { name: "AbortError" });
  assert.throws(() => sampleClampedSpline([point(0, 0), point(1, 1)], { extra: 1 }, createRouteBudget()), /Unknown/);
  assert.throws(() => sampleClampedSpline([point(0, 0), point(1, 1)], {}, createRouteBudget(), -1), /held samples/);
  assert.throws(() => sampleClampedSpline([point(-1e308, 0), point(1e308, 0)], {}, createRouteBudget()), /finite/);
  assert.deepEqual(f, before);
});

test("straightening a deep hierarchy keeps all provenance controls without imposing the subdivision limit on ancestry", () => {
  const count = 5000;
  const hierarchyParents = Object.fromEntries(Array.from({ length: count }, (_, i) => [`n${i}`, i ? `n${i - 1}` : null]));
  const positions = Object.fromEntries(Array.from({ length: count }, (_, i) => [`n${i}`, point(i / (count - 1), 0)]));
  const f = fixture({ hierarchyParents, positions, nodeKeys: ["n0", `n${count - 1}`], edges: [["deep", "n0", `n${count - 1}`]] });
  const result = run(f, { strength: 0, maxSubdivisions: 1 });
  assert.equal(result.routes[0].provenance.hierarchyKeys.length, count);
  assert.equal(result.routes[0].controlPoints.length, count);
  assert.deepEqual(result.routes[0].commands, [{ op: "M", x: 0, y: 0 }, { op: "L", x: 1, y: 0 }]);
});
