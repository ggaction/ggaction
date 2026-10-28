import assert from "node:assert/strict";
import test from "node:test";
import { layoutGraphForce } from "../../../src/grammar/graph/force.js";
import { normalizeObservedGraph } from "../../../src/grammar/graph/normalize.js";
import { springPositions, repulsionPositions, pinnedPositions, isolatePositions } from "../../oracles/graph-force.js";

const graph = (count = 2, edges = [[0, 1]]) => normalizeObservedGraph(Array.from({ length: count }, (_, key) => ({ key })),
  edges.map(([sourceKey, targetKey], key) => ({ key, sourceKey, targetKey, weight: 0 })), { directed: false, selfLoops: true });
const defaults = { seed: 42, iterations: 1, linkDistance: 4, repulsion: 0, collisionRadius: 0, damping: 1, center: [0, 0], componentGap: 10 };
const initial = model => model.nodes.map(({ key }, index) => ({ key, x: index * 2 - 1, y: 0 }));
const points = result => result.nodes.map(({ x, y }) => [x, y]);
const close = (actual, expected) => actual.forEach((point, index) => point.forEach((value, axis) => assert.ok(Math.abs(value - expected[index][axis]) < 1e-10, `${value} != ${expected[index][axis]}`)));

test("force spring agrees with independent literal iterations and keeps zero-weight edges", () => {
  const model = graph(), positions = initial(model);
  springPositions.forEach((expected, iterations) => close(points(layoutGraphForce(model, { ...defaults, initialPositions: positions, iterations })), expected));
  close(points(layoutGraphForce(model, { ...defaults, initialPositions: positions, linkDistance: 2, repulsion: 4 })), repulsionPositions);
  close(points(layoutGraphForce(graph(2, [[0, 1], [1, 0]]), { ...defaults, initialPositions: positions })), [[-1.4, 0], [1.4, 0]]);
});

test("force pins preserve exact coordinates and velocities at every iteration", () => {
  const model = graph(), positions = initial(model), pinned = [{ key: model.nodes[0].key, fx: -1, fy: 0 }];
  close(points(layoutGraphForce(model, { ...defaults, initialPositions: positions, pinned })), pinnedPositions);
  for (const iterations of [0, 1, 20]) {
    const result = layoutGraphForce(model, { ...defaults, iterations, pinned });
    assert.equal(result.nodes[0].x, -1); assert.equal(result.nodes[0].y, 0);
    assert.equal(result.packing.components[0].pinned, true);
  }
  const allPinned = model.nodes.map(({ key }, index) => ({ key, fx: index * 10, fy: 8 }));
  close(points(layoutGraphForce(model, { ...defaults, iterations: 30, pinned: allPinned })), [[0, 8], [10, 8]]);
});

test("force component packing separates isolates and honors absolute pinned components", () => {
  const model = graph(3, []);
  close(points(layoutGraphForce(model, defaults)), isolatePositions);
  const pinned = [{ key: model.nodes[1].key, fx: 30, fy: -10 }];
  const result = layoutGraphForce(model, { ...defaults, pinned, collisionRadius: 2 });
  close(points(result), [[44, 0], [30, -10], [58, 0]]);
  const boxes = result.packing.components.map(item => item.bounds);
  assert.equal(boxes[0].left - boxes[1].right, 10);
  assert.equal(boxes[2].left - boxes[0].right, 10);
  close(points(layoutGraphForce(model, { ...defaults, componentGap: 0 })), [[-1, 0], [0, 0], [1, 0]]);
});

test("force empty, singleton, coincident collision and self-loop policies stay finite", () => {
  assert.deepEqual(layoutGraphForce(graph(0, []), { ...defaults, iterations: Number.MAX_SAFE_INTEGER }).nodes, []);
  close(points(layoutGraphForce(graph(1, []), { ...defaults, center: [4, -3] })), [[4, -3]]);
  const model = graph(), coincident = initial(model).map(node => ({ ...node, x: 0 }));
  close(points(layoutGraphForce(model, { ...defaults, linkDistance: 0, collisionRadius: 2, initialPositions: coincident })), [[-2, 0], [2, 0]]);
  close(points(layoutGraphForce(graph(2, [[0, 0], [0, 1]]), { ...defaults, initialPositions: initial(model) })), springPositions[1]);
  close(points(layoutGraphForce(model, { ...defaults, damping: 0, initialPositions: initial(model) })), springPositions[0]);
});

test("force is seeded, immutable and independent of wall clock", () => {
  const model = graph(4, [[0, 1], [1, 2], [2, 0], [2, 3]]), before = structuredClone(model);
  const options = { ...defaults, iterations: 40, repulsion: 3, collisionRadius: 0.5, damping: 0.8, center: [0, 0], maxNodes: 4, maxEdges: 5 };
  const result = layoutGraphForce(model, options);
  assert.deepEqual(layoutGraphForce(model, options), result);
  assert.notDeepEqual(points(layoutGraphForce(model, { ...options, seed: 99 })), points(result));
  assert.deepEqual(model, before); assert.equal(result.algorithmVersion, "exact-pair-spring@1");
  assert.ok(Object.isFrozen(result.nodes[0]) && Object.isFrozen(result.packing.components[0].bounds));
  options.center[0] = 20;
  assert.deepEqual(result.options.center, [0, 0]);
  const positioned = initial(graph()), result2 = layoutGraphForce(graph(), { ...defaults, initialPositions: positioned });
  positioned[0].x = 100;
  assert.equal(result2.options.initialPositions[0].x, -1);
});

test("force invalid options, sparse values and budgets reject before output allocation", () => {
  const model = graph(), before = structuredClone(model);
  for (const options of [null, {}, { ...defaults, extra: 1 }, { ...defaults, seed: -1 }, { ...defaults, seed: 2 ** 32 },
    { ...defaults, seed: 1.5 }, { ...defaults, iterations: -1 }, { ...defaults, iterations: 0.1 },
    { ...defaults, iterations: Number.MAX_SAFE_INTEGER }, { ...defaults, linkDistance: NaN },
    { ...defaults, repulsion: -1 }, { ...defaults, collisionRadius: Infinity }, { ...defaults, damping: 2 },
    { ...defaults, center: [1] }, { ...defaults, center: [NaN, 0] }, { ...defaults, center: Array(2) },
    { ...defaults, maxNodes: 1 }, { ...defaults, maxEdges: 0 }, { ...defaults, initialPositions: [] },
    { ...defaults, pinned: null }, { ...defaults, pinned: Array(2) }, { ...defaults, pinned: Array(3) }]) assert.throws(() => layoutGraphForce(model, options));
  for (const pin of [null, {}, { key: "unknown", fx: 0, fy: 0 }, { key: model.nodes[0].key, fx: 0, fy: NaN },
    { key: model.nodes[0].key, fx: 0, fy: 0, extra: 1 }]) assert.throws(() => layoutGraphForce(model, { ...defaults, pinned: [pin] }));
  const pin = { key: model.nodes[0].key, fx: 0, fy: 0 };
  assert.throws(() => layoutGraphForce(model, { ...defaults, pinned: [pin, pin] }));
  assert.throws(() => layoutGraphForce(graph(1000, Array.from({ length: 999 }, (_, i) => [i, i + 1])), { ...defaults, iterations: 100 }), /work/);
  assert.deepEqual(model, before);
});

test("force own-data validation rejects accessors without invoking them", () => {
  let reads = 0;
  const options = Object.defineProperty({ ...defaults }, "seed", { enumerable: true, get() { reads++; return 1; } });
  assert.throws(() => layoutGraphForce(graph(), options));
  const pin = Object.defineProperty({ key: graph().nodes[0].key, fy: 0 }, "fx", { enumerable: true, get() { reads++; return 0; } });
  assert.throws(() => layoutGraphForce(graph(), { ...defaults, pinned: [pin] }));
  Object.defineProperty(Object.prototype, "pinned", { configurable: true, get() { reads++; return []; } });
  Object.defineProperty(Object.prototype, "initialPositions", { configurable: true, get() { reads++; return []; } });
  try { assert.equal(layoutGraphForce(graph(), defaults).nodes.length, 2); }
  finally { delete Object.prototype.pinned; delete Object.prototype.initialPositions; }
  assert.equal(reads, 0);
});

test("force arithmetic overflow and malformed adjacency fail without mutating input", () => {
  const model = graph(), positions = initial(model), options = { ...defaults, initialPositions: positions };
  for (const changes of [{ collisionRadius: Number.MAX_VALUE }, { repulsion: Number.MAX_VALUE, iterations: 10 },
    { linkDistance: Number.MAX_VALUE, iterations: 10 },
    { initialPositions: positions.map((node, i) => ({ ...node, x: i ? Number.MAX_VALUE : -Number.MAX_VALUE })) }]) {
    assert.throws(() => layoutGraphForce(model, { ...options, ...changes }), /finite|Force graph/);
  }
  assert.throws(() => layoutGraphForce(graph(3, []), { ...defaults, componentGap: Number.MAX_VALUE }), /finite/);
  const broken = structuredClone(model); broken.adjacency[0].neighbors = [];
  assert.throws(() => layoutGraphForce(broken, defaults), /adjacency/);
});
