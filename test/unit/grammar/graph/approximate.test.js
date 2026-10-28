import assert from "node:assert/strict";
import test from "node:test";
import { inferGraphNeighbors } from "../../../../src/grammar/graph/neighbors.js";
import { numericNearestPairs, graphPairRecall } from "../../../oracles/graphSearch.js";
const base = { ruleId: "r", rule: "knn", metric: "euclidean", k: 2 };
const approximate = patch => ({ mode: "approximate", seed: 42, ...patch });
function infer(keys, values, options = base, patch = {}) {
  return inferGraphNeighbors(keys, values, { ...options, search: approximate(patch) });
}
test("opt-in approximate search stores resolved presets, seed and measured exact recall", () => {
  const keys = Array.from({ length: 20 }, (_, i) => i), values = keys.map(i => [i, i % 3]);
  const result = infer(keys, values);
  assert.deepEqual(result.edges, inferGraphNeighbors(keys, values, base).edges);
  for (const [name, expected] of Object.entries({ mode: "approximate", algorithm: "projection-forest", seed: 42,
    trees: 8, projections: 1, leafSize: 32, searchLeaves: 16, fallback: "error", minRecall: .95,
    algorithmVersion: "projection-forest@1", measuredRecall: 1, holdoutCount: 20 })) assert.equal(result.search[name], expected, name);
  assert.equal(result.search.candidateCount, 20 * 19);
  assert.ok(result.search.candidateCounts.every(count => count === 19));
  assert.deepEqual(result, infer(keys, values)); assert.ok(Object.isFrozen(result.search.candidateCounts));
  assert.equal(inferGraphNeighbors(keys, values, base).search, undefined);
});
test("projection candidates are exactly reranked across all supported metrics", () => {
  const keys = ["a", "b", "c", "d"];
  for (const [metric, values, extra] of [
    ["manhattan", [[0, 0], [1, 1], [2, 2], [5, 3]], {}],
    ["cosine", [[0, 0], [1, 1], [-2, 2], [5, 3]], { zeroVector: "zero-similarity" }],
    ["jaccard", [[], [1, "1"], [true, 1], [false]], {}],
    ["great-circle", [[179, 0], [-179, 0], [0, 90], [20, 30]], {}]
  ]) {
    const options = { ...base, metric, ...extra };
    assert.deepEqual(infer(keys, values, options).edges, inferGraphNeighbors(keys, values, options).edges);
  }
});
test("approximate selection preserves typed ties, preprocessing, omission and small inputs", () => {
  const options = { ...base, k: 1, preprocess: "minmax", missing: "omit-node", symmetrize: "mutual" };
  const keys = ["origin", "1", 1, false, "missing"], values = [[0], [-1], [1], [1], [null]];
  const result = infer(keys, values, options);
  assert.deepEqual(result.edges, inferGraphNeighbors(keys, values, options).edges);
  assert.deepEqual(result.preparation.sourceIndices, [0, 1, 2, 3]);
  for (const [names, data] of [[[], []], [["a"], [[0]]]]) {
    const small = infer(names, data);
    assert.deepEqual(small.edges, []); assert.equal(small.search.measuredRecall, 1);
    assert.equal(small.search.holdoutCount, names.length); assert.equal(small.effectiveK, 0);
  }
});
test("insufficient candidates require the recorded error or exact fallback policy", () => {
  const keys = ["a", "b", "c", "d"], values = [[0], [1], [3], [8]];
  const patch = { trees: 1, leafSize: 1, searchLeaves: 1 };
  assert.throws(() => infer(keys, values, base, patch), error => error.code === "GGACTION_GRAPH_CANDIDATES" && error.details.candidateCount === 0);
  const result = infer(keys, values, base, { ...patch, fallback: "exact" });
  assert.deepEqual(result.edges, inferGraphNeighbors(keys, values, base).edges);
  assert.deepEqual(result.search.fallbackQueries, [0, 1, 2, 3]);
  assert.deepEqual(result.search.candidateCounts, [0, 0, 0, 0]);
  assert.equal(result.search.measuredRecall, 1);
});
test("poor measured recall rejects an incomplete result instead of reporting exact search", () => {
  const keys = Array.from({ length: 120 }, (_, i) => i), values = keys.map(i => [i % 12, Math.floor(i / 12)]);
  const before = structuredClone(values);
  assert.throws(() => infer(keys, values, base, { trees: 1, leafSize: 8, searchLeaves: 1 }), error =>
    error.code === "GGACTION_GRAPH_RECALL" && error.details.measuredRecall < .95 && error.details.holdoutCount === 120);
  assert.deepEqual(values, before);
});
test("approximate policy is closed, typed and limited to explicit kNN", () => {
  const keys = ["a", "b", "c"], values = [[0], [1], [2]];
  for (const patch of [{ seed: undefined }, { seed: -1 }, { seed: 2 ** 32 }, { algorithm: "kd-tree" },
    { trees: 0 }, { trees: 65 }, { projections: 2 }, { leafSize: 0 }, { searchLeaves: null }, { searchLeaves: 1025 },
    { fallback: null }, { minRecall: .94 }, { minRecall: 1.1 }, { extra: 1 }]) assert.throws(() => infer(keys, values, base, patch));
  assert.throws(() => infer(keys, values, { ruleId: "r", rule: "radius", metric: "euclidean", radius: 1 }), /kNN/);
  let reads = 0;
  assert.throws(() => inferGraphNeighbors(keys, values, { ...base, search: { mode: "approximate", get seed() { reads++; return 1; } } }), /data properties/);
  assert.equal(reads, 0);
});
test("qualification work is bounded before a large approximate index is built", () => {
  const keys = Array.from({ length: 1001 }, (_, i) => i);
  assert.throws(() => infer(keys, keys.map(i => [i])), /approximate search work/);
});
test("a restricted forest reports independent recall and enforces a stricter requested minimum", () => {
  const keys = Array.from({ length: 128 }, (_, i) => i), values = keys.map(i => [i % 16, Math.floor(i / 16)]);
  const patch = { trees: 8, leafSize: 8, searchLeaves: 1 };
  const result = infer(keys, values, base, patch), exact = inferGraphNeighbors(keys, values, base);
  const expected = numericNearestPairs(keys, values, 2);
  assert.deepEqual(exact.edges.map(edge => [edge.sourceIndex, edge.targetIndex]), expected);
  const recall = graphPairRecall(expected, result.edges.map(edge => [edge.sourceIndex, edge.targetIndex]));
  assert.equal(recall, .984375); assert.equal(result.search.measuredRecall, recall);
  assert.equal(result.search.candidateCount, 5416);
  assert.ok(result.search.candidateCount < keys.length * (keys.length - 1));
  assert.equal(result.search.mode, "approximate");
  assert.throws(() => infer(keys, values, base, { ...patch, minRecall: 1 }), error =>
    error.code === "GGACTION_GRAPH_RECALL" && error.details.measuredRecall === recall && error.details.minRecall === 1);
  const reordered = infer([...keys].reverse(), [...values].reverse(), base, patch);
  assert.deepEqual(reordered.edges.map(({ key, weight }) => ({ key, weight })), result.edges.map(({ key, weight }) => ({ key, weight })));
});
test("projection scaling tolerates large finite coordinates and preserves zero distance ties", () => {
  const keys = ["a", "b", "c", "d"], values = [[0, 0], [1e150, 1e150], [1e150, 1e150], [-1e150, -1e150]];
  const result = infer(keys, values);
  assert.deepEqual(result.edges, inferGraphNeighbors(keys, values, base).edges);
  assert.ok(result.edges.some(edge => edge.weight === 0));
  assert.deepEqual(infer(keys, keys.map(() => []), { ...base, metric: "jaccard" }).edges,
    inferGraphNeighbors(keys, keys.map(() => []), { ...base, metric: "jaccard" }).edges);
});
