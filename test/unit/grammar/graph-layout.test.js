import assert from "node:assert/strict";
import test from "node:test";
import { normalizeObservedGraph } from "../../../src/grammar/graph/normalize.js";
import { createGraphModel } from "../../../src/grammar/graph/model.js";
import { layoutGraphFixed, layoutGraphCircular } from "../../../src/grammar/graph/layout.js";
import { graphNodes, graphEdges, nodeTokens } from "../../oracles/graph.js";
import { fixedPoints, cardinalCircle, triangleCircle, repeatedRotationCircle } from "../../oracles/graph-layout.js";

const make = () => normalizeObservedGraph(graphNodes, graphEdges, { directed: true });
const empty = () => normalizeObservedGraph([], [], { directed: false });
const isolate = count => normalizeObservedGraph(Array.from({ length: count }, (_, key) => ({ key })), [], { directed: false });
const fixed = () => nodeTokens.map((key, index) => ({ key, x: fixedPoints[index][0], y: fixedPoints[index][1] }));
const circular = { center: [10, 20], radius: 5, startAngle: 0 };
const coordinates = result => result.nodes.map(({ x, y }) => [x, y]);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-11 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test("fixed graph positions bind exact opaque keys and retain canonical graph order", () => {
  const model = make(), positions = fixed().reverse(), before = structuredClone({ model, positions });
  const result = layoutGraphFixed(model, positions);
  assert.equal(result.method, "fixed");
  assert.deepEqual(result.nodes.map(node => node.key), nodeTokens);
  assert.deepEqual(coordinates(result), fixedPoints);
  assert.deepEqual(result.options, { maxNodes: 10000, maxEdges: 10000 });
  assert.deepEqual({ model, positions }, before);
  positions[0].x = 999;
  assert.deepEqual(coordinates(result), fixedPoints);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.nodes) && Object.isFrozen(result.nodes[0]));
  assert.deepEqual(layoutGraphFixed(empty(), []).nodes, []);
  const singleton = isolate(1);
  assert.ok(Object.is(layoutGraphFixed(singleton, [{ key: singleton.nodes[0].key, x: -0, y: Number.MAX_VALUE }]).nodes[0].x, -0));
});

test("circular graph cardinal and triangle fixtures use stable clockwise node order", () => {
  const result = layoutGraphCircular(make(), circular);
  assert.equal(result.method, "circular");
  assert.deepEqual(result.nodes.map(node => node.key), nodeTokens);
  coordinates(result).forEach((point, index) => point.forEach((value, axis) => close(value, cardinalCircle[index][axis])));
  const triangle = layoutGraphCircular(isolate(3), { center: [0, 0], radius: 2, startAngle: 0 });
  coordinates(triangle).forEach((point, index) => point.forEach((value, axis) => close(value, triangleCircle[index][axis])));
  assert.deepEqual(repeatedRotationCircle(0, [0, 0], 1, 0), []);
  assert.deepEqual(repeatedRotationCircle(1, [2, 3], 1, 0), [[2, 3]]);
});

test("circular layout agrees with independent repeated rotations and preserves radius and chord lengths", () => {
  for (const count of [2, 3, 4, 7, 32]) for (const startAngle of [-120, 0, 45, 360]) {
    const model = isolate(count), options = { center: [-12, 9], radius: 7, startAngle };
    const result = layoutGraphCircular(model, options), expected = repeatedRotationCircle(count, options.center, options.radius, startAngle);
    coordinates(result).forEach((point, index, points) => {
      point.forEach((value, axis) => close(value, expected[index][axis]));
      close(Math.hypot(point[0] + 12, point[1] - 9), 7);
      const next = points[(index + 1) % count];
      close(Math.hypot(next[0] - point[0], next[1] - point[1]), 14 * Math.sin(Math.PI / count));
    });
    assert.deepEqual(layoutGraphCircular(model, options), result);
  }
});

test("circular empty, singleton and zero radius policies keep identity without inventing edges", () => {
  assert.deepEqual(layoutGraphCircular(empty(), circular).nodes, []);
  assert.deepEqual(coordinates(layoutGraphCircular(isolate(1), circular)), [[10, 20]]);
  const model = make(), before = structuredClone(model), options = structuredClone(circular);
  const result = layoutGraphCircular(model, options);
  options.center[0] = 999;
  assert.deepEqual(result.options, { ...circular, maxNodes: 10000, maxEdges: 10000 });
  assert.ok(Object.isFrozen(result.options.center));
  assert.deepEqual(coordinates(layoutGraphCircular(model, { ...circular, radius: 0 })), Array(4).fill([10, 20]));
  assert.deepEqual(model, before);
});

test("fixed graph layout rejects missing, duplicate, unknown and nonfinite positions atomically", () => {
  const model = make(), before = structuredClone(model);
  for (const positions of [undefined, null, {}, [], Array(4), [...fixed(), fixed()[0]],
    fixed().map((position, index) => index ? position : null),
    fixed().map((position, index) => index ? position : { ...position, extra: 1 }),
    fixed().map((position, index) => index ? position : { key: position.key, x: 1 }),
    fixed().map((position, index) => index ? position : { ...position, key: "" }),
    fixed().map((position, index) => index ? position : { ...position, key: 1 }),
    fixed().map((position, index) => index ? position : { ...position, key: "unknown" }),
    fixed().map((position, index) => index ? position : { ...position, key: nodeTokens[1] }),
    fixed().map((position, index) => index ? position : { ...position, x: NaN }),
    fixed().map((position, index) => index ? position : { ...position, y: Infinity })]) {
    assert.throws(() => layoutGraphFixed(model, positions));
  }
  assert.throws(() => layoutGraphFixed(model, fixed(), { maxNodes: 3 }), /nodes/);
  assert.throws(() => layoutGraphFixed(model, fixed(), { maxEdges: 2 }), /edges/);
  assert.deepEqual(model, before);
});

test("circular graph rejects ambiguous options, invalid shape and coordinate overflow", () => {
  const model = make();
  for (const options of [null, {}, { ...circular, extra: true }, { ...circular, center: null },
    { ...circular, center: [1] }, { ...circular, center: [NaN, 1] }, { ...circular, center: Array(2) },
    { ...circular, radius: -1 }, { ...circular, radius: Infinity }, { ...circular, startAngle: NaN },
    { ...circular, maxNodes: 1 }, { ...circular, maxEdges: 2 },
    { ...circular, startAngle: Number.MAX_VALUE },
    { ...circular, center: [Number.MAX_VALUE, 0], radius: Number.MAX_VALUE, startAngle: 90 },
    { ...circular, center: [0, -Number.MAX_VALUE], radius: Number.MAX_VALUE }]) {
    assert.throws(() => layoutGraphCircular(model, options));
  }
  const forged = structuredClone(model); forged.adjacency[0].neighbors = [];
  assert.throws(() => layoutGraphCircular(forged, circular), /adjacency/);
  assert.throws(() => layoutGraphFixed(forged, fixed()), /adjacency/);
});

test("graph layout own-data boundaries do not execute accessors or inherit options", () => {
  const model = make(); let reads = 0;
  const position = Object.defineProperty({ key: nodeTokens[0], y: 1 }, "x", { enumerable: true, get() { reads++; return 1; } });
  assert.throws(() => layoutGraphFixed(model, [position, ...fixed().slice(1)]));
  const options = Object.defineProperty({ ...circular }, "radius", { enumerable: true, get() { reads++; return 1; } });
  assert.throws(() => layoutGraphCircular(model, options));
  Object.defineProperty(Object.prototype, "maxNodes", { configurable: true, get() { reads++; return 1; } });
  try {
    assert.equal(layoutGraphFixed(model, fixed()).nodes.length, 4);
    assert.equal(layoutGraphCircular(model, circular).nodes.length, 4);
  } finally { delete Object.prototype.maxNodes; }
  assert.equal(reads, 0);
});

test("fixed and circular layout work adds to model validation before allocating output", () => {
  const model = make();
  assert.throws(() => layoutGraphFixed(model, Array(10_000_000)), /cover every node/);
  const key = "k".repeat(1_250_000);
  const keyed = createGraphModel([{ key, sourceRows: [], attributes: {} }], [], { directed: false, selfLoops: false });
  assert.throws(() => layoutGraphFixed(keyed, [{ key, x: 0, y: 0 }]), /layout work/);
  const longerKey = "k".repeat(2_499_970);
  const nearLimit = createGraphModel([{ key: longerKey, sourceRows: [], attributes: {} }], [], { directed: false, selfLoops: false });
  assert.throws(() => layoutGraphCircular(nearLimit, circular), /layout work/);
  assert.equal(nearLimit.nodes[0].key, longerKey);
});
