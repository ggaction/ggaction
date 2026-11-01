import test from "node:test";
import assert from "node:assert/strict";
import { reanchorRoute } from "../../src/grammar/graph/routes/polyline.js";
import { moveGraphPresentationNode, unbundleGraphPresentationEdge } from "../../src/materialization/graph/presentation.js";

function group() {
  return { key: "owner", graph: { kind: "graph", id: "graph", revision: 1 }, layout: { kind: "layout", id: "layout", revision: 2 },
    route: { kind: "edge-route", id: "route", revision: 3 }, coordinateSpace: "world", origin: [10, 20], labelOffset: [0, -10],
    nodes: [{ key: "a", x: 0, y: 0, radius: 5 }, { key: "b", x: 90, y: 0, radius: 5 }, { key: "c", x: 45, y: 30, radius: 5 }],
    edges: [{ key: "ab", sourceKey: "a", targetKey: "b", points: [{ x: 0, y: 0 }, { x: 45, y: 30 }, { x: 90, y: 0 }] },
      { key: "bc", sourceKey: "b", targetKey: "c", points: [{ x: 90, y: 0 }, { x: 45, y: 30 }] }],
    edgeStyle: { arrows: true, arrowSize: 6, parallelGap: 10, loopRadius: 15 } };
}

test("selected route presentation uses native body and arrow geometry without changing any resource", () => {
  const input = group(), before = structuredClone(input), result = unbundleGraphPresentationEdge(input, "ab");
  assert.deepEqual(result.commands, [{ op: "M", x: 15, y: 20 }, { op: "C", x1: 40, y1: 20, x2: 70, y2: 20, x: 95, y: 20 }]);
  assert.deepEqual(result.arrowCommands, [{ op: "M", x: 95, y: 20 }, { op: "L", x: 89, y: 23 }, { op: "L", x: 89, y: 17 }, { op: "Z" }]);
  assert.deepEqual(Object.keys(result), ["commands", "arrowCommands"]);
  assert.deepEqual(input, before); assert.ok(Object.isFrozen(result.commands[1]));
});

test("temporary parallel and loop geometry keeps the full native edge order", () => {
  const input = group(); input.edgeStyle.arrows = false;
  input.edges.push({ key: "ab2", sourceKey: "a", targetKey: "b" }, { key: "aa", sourceKey: "a", targetKey: "a" });
  const first = unbundleGraphPresentationEdge(input, "ab"), second = unbundleGraphPresentationEdge(input, "ab2");
  assert.equal(first.commands[1].y1, 15); assert.equal(second.commands[1].y1, 25);
  assert.equal(Object.hasOwn(first, "arrowCommands"), false);
  assert.deepEqual(unbundleGraphPresentationEdge(input, "aa").commands,
    [{ op: "M", x: 5, y: 20 }, { op: "C", x1: -10, y1: -10, x2: 30, y2: -10, x: 15, y: 20 }]);
});

test("route attachment preserves sample order and distributes displacement by arc length", () => {
  const points = [{ x: 0, y: 0 }, { x: 0, y: 2 }, { x: 4, y: 2 }], before = structuredClone(points);
  const attached = reanchorRoute(points, { x: 3, y: 0 }, { x: 4, y: 5 });
  assert.deepEqual(attached, [{ x: 3, y: 0 }, { x: 2, y: 3 }, { x: 4, y: 5 }]);
  assert.deepEqual(points, before); attached[1].x = 100; assert.equal(points[1].x, 0);
  const unchanged = reanchorRoute(points, points[0], points.at(-1));
  assert.deepEqual(unchanged, points); assert.notEqual(unchanged[0], points[0]);
});

test("repeated and collapsed samples have deterministic attached endpoints", () => {
  const repeated = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 6, y: 0 }];
  assert.deepEqual(reanchorRoute(repeated, { x: 0, y: 3 }, { x: 6, y: 3 }),
    [{ x: 0, y: 3 }, { x: 0, y: 3 }, { x: 6, y: 3 }]);
  assert.deepEqual(reanchorRoute(Array.from({ length: 3 }, () => ({ x: 1, y: 1 })), { x: 2, y: 3 }, { x: 4, y: 5 }),
    [{ x: 2, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 5 }]);
});

test("moving a current graph node preserves all identities and only reattaches incident routes", () => {
  const input = group(), before = structuredClone(input), result = moveGraphPresentationNode(input, "a", { x: 0, y: 20 });
  assert.deepEqual(result.nodes, [{ key: "a", x: 0, y: 20, radius: 5 }, ...before.nodes.slice(1)]);
  assert.deepEqual(result.edges[0].points, [{ x: 0, y: 20 }, { x: 45, y: 40 }, { x: 90, y: 0 }]);
  assert.deepEqual(result.edges[1], before.edges[1]);
  for (const key of ["graph", "layout", "route", "coordinateSpace", "origin", "labelOffset", "edgeStyle"]) assert.deepEqual(result[key], before[key]);
  assert.deepEqual(input, before); assert.ok(Object.isFrozen(result.edges[0].points[1]));
  assert.deepEqual(moveGraphPresentationNode(input, "a", { x: 0, y: 0 }), before);
});

test("moving target endpoints, self loops and unbundled graphs keeps the same node grain", () => {
  const input = group();
  input.edges.push({ key: "bb", sourceKey: "b", targetKey: "b", points: [{ x: 90, y: 0 }, { x: 100, y: 10 }, { x: 90, y: 0 }] },
    { key: "plain", sourceKey: "a", targetKey: "b" });
  const result = moveGraphPresentationNode(input, "b", { x: 100, y: -10 });
  assert.deepEqual(result.edges[0].points.at(-1), { x: 100, y: -10 });
  assert.deepEqual(result.edges[1].points[0], { x: 100, y: -10 });
  assert.deepEqual(result.edges[2].points, [{ x: 100, y: -10 }, { x: 110, y: 0 }, { x: 100, y: -10 }]);
  assert.deepEqual(result.edges[3], input.edges[3]);
  assert.equal(result.nodes.length, input.nodes.length);
});

test("presentation rejects missing identities and nonfinite or executable coordinates atomically", () => {
  const input = group(), before = structuredClone(input);
  assert.throws(() => unbundleGraphPresentationEdge(input, "missing"), /existing edge/);
  assert.throws(() => moveGraphPresentationNode(input, "missing", { x: 0, y: 0 }), /existing node/);
  for (const position of [{ x: NaN, y: 0 }, { x: 0 }, { x: 0, y: 0, z: 0 }, null]) {
    assert.throws(() => moveGraphPresentationNode(input, "a", position));
  }
  let reads = 0;
  assert.throws(() => moveGraphPresentationNode(input, "a", { get x() { reads++; return 0; }, y: 0 }), /accessors/);
  assert.equal(reads, 0); assert.deepEqual(input, before);
  input.origin = [Number.MAX_VALUE, 0]; input.nodes[0].x = Number.MAX_VALUE;
  assert.throws(() => unbundleGraphPresentationEdge(input, "ab"), /finite/);
});

test("route attachment rejects malformed points, nonfinite deltas and interior overflow", () => {
  assert.throws(() => reanchorRoute([{ x: 0, y: 0 }], { x: 1, y: 0 }, { x: 2, y: 0 }), /two endpoints/);
  assert.throws(() => reanchorRoute([{ x: 0, y: 0 }, { x: 1, y: 0 }], { x: NaN, y: 0 }, { x: 1, y: 0 }), /finite/);
  const max = Number.MAX_VALUE;
  assert.throws(() => reanchorRoute([{ x: -max, y: 0 }, { x: -max, y: 0 }], { x: max, y: 0 }, { x: max, y: 0 }), /displacement/);
  assert.throws(() => reanchorRoute([{ x: max / 2, y: 0 }, { x: max, y: 0 }, { x: max / 2, y: 0 }], { x: max, y: 0 }, { x: max, y: 0 }), /coordinates/);
});

test("presentation counts cumulative route work before allocating replacement vectors", () => {
  const input = group(), points = Array.from({ length: 10_000 }, () => ({ x: 0, y: 0 }));
  input.edges = Array.from({ length: 1000 }, (_, index) => ({ key: `edge-${index}`, sourceKey: "a", targetKey: "b", points }));
  assert.throws(() => moveGraphPresentationNode(input, "a", { x: 1, y: 0 }), /work must not exceed/i);
  assert.equal(input.nodes[0].x, 0);
});
