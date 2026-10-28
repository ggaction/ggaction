import assert from "node:assert/strict";
import test from "node:test";
import { inferGraphMst, selectGraphSpanningForest } from "../../../../src/grammar/graph/spanning.js";
import { spanningCost } from "../../../oracles/graphSpanning.js";

const keys = ["a", "b", "c", "d"], vectors = [[0], [1], [3], [10]];
const options = { ruleId: "tree", metric: "euclidean" };
const candidate = (sourceIndex, targetIndex, weight) => ({ sourceIndex, targetIndex, weight });
const pairs = result => result.edges.map(edge => [edge.sourceIndex, edge.targetIndex, edge.weight]);

test("metric spanning tree preserves the literal cost ten and zero-distance edges", () => {
  const result = inferGraphMst(keys, vectors, options);
  assert.deepEqual(pairs(result), [[0, 1, 1], [1, 2, 2], [2, 3, 7]]);
  assert.equal(result.cost, 10); assert.equal(result.components, 1); assert.equal(result.pairCount, 6);
  assert.equal(result.options.forest, false);
  assert.deepEqual(pairs(inferGraphMst(keys.slice(0, 3), [[0], [0], [2]], options)), [[0, 1, 0], [0, 2, 2]]);
  assert.deepEqual(spanningCost(4, [[0, 1, 1], [1, 2, 2], [2, 3, 7], [0, 3, 10]]), { cost: 10, components: 1 });
});

test("candidate graph disconnects require explicit forest and preserve isolated nodes", () => {
  const edges = [candidate(0, 1, 2)];
  assert.throws(() => selectGraphSpanningForest(keys, edges, { ruleId: "r" }), /disconnected/);
  const result = selectGraphSpanningForest(keys, edges, { ruleId: "r", forest: true });
  assert.deepEqual(pairs(result), [[0, 1, 2]]); assert.equal(result.components, 3); assert.equal(result.cost, 2);
  assert.deepEqual(result.componentNodes, [[0, 1], [2], [3]]);
  assert.ok(Object.isFrozen(result.componentNodes[0]));
  assert.equal(selectGraphSpanningForest([], [], { ruleId: "r" }).components, 0);
  assert.equal(selectGraphSpanningForest([1], [], { ruleId: "r" }).components, 1);
});

test("equal-cost candidates use typed endpoint order independent of candidate and node order", () => {
  const names = ["1", 1, false, ["x"]];
  const edges = [candidate(0, 1, 0), candidate(1, 2, 0), candidate(2, 3, 0), candidate(3, 0, 0), candidate(0, 2, 0)];
  const result = selectGraphSpanningForest(names, edges, { ruleId: "r" });
  assert.deepEqual(pairs(result), [[2, 1, 0], [2, 0, 0], [2, 3, 0]]);
  const reverse = selectGraphSpanningForest([...names].reverse(), [...edges].reverse().map(edge => candidate(3 - edge.targetIndex, 3 - edge.sourceIndex, edge.weight)), { ruleId: "r" });
  assert.deepEqual(result.edges.map(edge => edge.key), reverse.edges.map(edge => edge.key));
  assert.ok(result.edges.every(edge => !edge.directed));
});

test("seeded candidate forests match an independent Prim cost and component oracle", () => {
  let seed = 129;
  const next = () => (seed = (1664525 * seed + 1013904223) >>> 0);
  for (let sample = 0; sample < 100; sample++) {
    const names = Array.from({ length: 9 }, (_, i) => i), edges = [];
    for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) if (next() % 3) edges.push(candidate(a, b, next() % 20));
    const result = selectGraphSpanningForest(names, edges, { ruleId: "r", forest: true });
    const expected = spanningCost(9, edges.map(({ sourceIndex, targetIndex, weight }) => [sourceIndex, targetIndex, weight]));
    assert.equal(result.cost, expected.cost); assert.equal(result.components, expected.components);
    assert.equal(result.edges.length, names.length - expected.components);
  }
});

test("parallel candidate connections retain minimum weight without duplicate inferred identities", () => {
  const edges = [candidate(0, 1, 5), candidate(1, 0, 3), candidate(0, 1, 3), candidate(0, 0, 0)];
  const result = selectGraphSpanningForest(["a", "b"], edges, { ruleId: "r" });
  assert.deepEqual(pairs(result), [[0, 1, 3]]);
  assert.equal(result.candidateCount, 4);
  const revised = selectGraphSpanningForest(["a", "b"], [candidate(0, 1, 7)], { ruleId: "r" });
  assert.equal(result.edges[0].key, revised.edges[0].key);
});

test("metric preparation retains source positions, exclusion reasons and feature statistics", () => {
  const result = inferGraphMst(keys, [[0], [null], [2], [10]], { ...options, preprocess: "minmax", missing: "omit-node" });
  assert.deepEqual(result.preparation.sourceIndices, [0, 2, 3]);
  assert.deepEqual(pairs(result), [[0, 2, .2], [2, 3, .8]]);
  assert.deepEqual(result.componentNodes, [[0, 2, 3]]);
  assert.equal(result.cost, 1);
  assert.equal(inferGraphMst(["a"], [[null]], { ...options, missing: "omit-node" }).components, 0);
  assert.equal(inferGraphMst([], [], options).components, 0);
  assert.equal(inferGraphMst(["a"], [[1]], options).components, 1);
  assert.equal(inferGraphMst(["a", "b"], [[0], [1]], { ruleId: "r", metric: "cosine", zeroVector: "zero-similarity" }).cost, 1);
  assert.equal(inferGraphMst(["a", "b"], [[], []], { ruleId: "r", metric: "jaccard" }).cost, 0);
});

test("invalid weights, indexes, keys and options fail without mutating inputs", () => {
  const edges = [candidate(0, 1, 1)], before = structuredClone(edges);
  for (const patch of [{ forest: null }, { metric: "euclidean" }, { ruleId: "" }]) assert.throws(() => selectGraphSpanningForest(keys, edges, { ruleId: "r", ...patch }));
  for (const edge of [candidate(-1, 1, 1), candidate(0, 4, 1), candidate(0, 1.5, 1), candidate(0, 1, -1), candidate(0, 1, Infinity), { ...candidate(0, 1, 1), unknown: 1 }]) {
    assert.throws(() => selectGraphSpanningForest(keys, [edge], { ruleId: "r", forest: true }));
  }
  assert.throws(() => selectGraphSpanningForest([1, 1], [], { ruleId: "r" }), /unique/);
  assert.throws(() => inferGraphMst(keys, vectors, { ...options, forest: null }), /boolean/);
  assert.throws(() => inferGraphMst(keys, vectors, { ...options, k: 1 }), /property/);
  assert.throws(() => inferGraphMst(keys, vectors.slice(1), options), /equal length/);
  assert.deepEqual(edges, before);
});

test("input descriptors and resource work limits are checked before allocation", () => {
  let reads = 0;
  const edge = { sourceIndex: 0, targetIndex: 1, get weight() { reads++; return 1; } };
  assert.throws(() => selectGraphSpanningForest(keys, [edge], { ruleId: "r" }), /data properties/);
  assert.throws(() => selectGraphSpanningForest(keys, [], { ruleId: "r", get forest() { reads++; return true; } }), /data properties/);
  assert.equal(reads, 0);
  assert.throws(() => selectGraphSpanningForest(Array(10001), [], { ruleId: "r" }), /nodes/);
  assert.throws(() => selectGraphSpanningForest(keys, Array(1000000), { ruleId: "r" }), /work/);
  const large = Array.from({ length: 1000 }, (_, i) => i);
  assert.throws(() => inferGraphMst(large, large.map(x => [x]), options), /work/);
  assert.throws(() => inferGraphMst([], Array(10001), options), /nodes/);
  assert.throws(() => inferGraphMst([], null, options), /array/);
  assert.throws(() => selectGraphSpanningForest(null, [], { ruleId: "r" }), /array/);
  assert.throws(() => selectGraphSpanningForest([], null, { ruleId: "r" }), /array/);
  assert.throws(() => selectGraphSpanningForest([], [], null), /plain object/);
  assert.throws(() => selectGraphSpanningForest([1, 2, 3], [candidate(0, 1, Number.MAX_VALUE), candidate(1, 2, Number.MAX_VALUE)], { ruleId: "r" }), /finite numeric range/);
});

test("spanning options and candidate fields never read inherited accessors", () => {
  let reads = 0;
  Object.defineProperty(Object.prototype, "forest", { configurable: true, get() { reads++; return true; } });
  try {
    assert.throws(() => selectGraphSpanningForest(keys, [], { ruleId: "r" }), /disconnected/);
  } finally { delete Object.prototype.forest; }
  Object.defineProperty(Object.prototype, "weight", { configurable: true, get() { reads++; return 1; } });
  try {
    assert.throws(() => selectGraphSpanningForest(keys, [{ sourceIndex: 0, targetIndex: 1 }], { ruleId: "r" }), /weight/);
  } finally { delete Object.prototype.weight; }
  assert.equal(reads, 0);
});
