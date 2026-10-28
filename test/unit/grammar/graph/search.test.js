import assert from "node:assert/strict";
import test from "node:test";
import { inferGraphNeighbors } from "../../../../src/grammar/graph/neighbors.js";
const base = { ruleId: "r", rule: "knn", metric: "euclidean", k: 2 };
const search = algorithm => ({ mode: "exact", algorithm });
function compare(keys, vectors, options, algorithm) {
  const brute = inferGraphNeighbors(keys, vectors, options);
  const accelerated = inferGraphNeighbors(keys, vectors, { ...options, search: search(algorithm) });
  assert.deepEqual(accelerated.edges, brute.edges);
  assert.deepEqual(accelerated.preparation, brute.preparation);
  assert.equal(accelerated.search.mode, "exact");
  assert.equal(accelerated.search.algorithm, algorithm);
  return accelerated;
}
test("KD-tree and radius grid exactly match brute force on 100 seeded multivariate fixtures", () => {
  let seed = 19073;
  const next = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % 21) - 10;
  for (let fixture = 0; fixture < 100; fixture++) {
    const keys = Array.from({ length: 12 }, (_, i) => i % 2 ? String(i) : i);
    const vectors = keys.map(() => Array.from({ length: 1 + fixture % 3 }, next));
    for (const metric of ["euclidean", "manhattan"]) {
      compare(keys, vectors, { ...base, metric, symmetrize: ["directed", "union", "mutual"][fixture % 3] }, "kd-tree");
      const options = { ruleId: "r", rule: "radius", metric, radius: fixture % 7, directed: fixture % 2 === 0 };
      compare(keys, vectors, options, "kd-tree");
      compare(keys, vectors, options, "grid");
    }
  }
});
test("search includes ties, exact radius boundaries, duplicate coordinates and typed key order", () => {
  const keys = ["origin", "1", 1, false], values = [[0], [-1], [1], [1]];
  assert.equal(compare(keys, values, { ...base, k: 1 }, "kd-tree").edges[0].weight, 0);
  for (const algorithm of ["kd-tree", "grid"]) {
    compare(keys, values, { ruleId: "r", rule: "radius", metric: "euclidean", radius: 1 }, algorithm);
    compare(keys, values, { ruleId: "r", rule: "radius", metric: "manhattan", radius: 0, directed: true }, algorithm);
    compare([0, 1, 2], [[0.3], [0.1 + 0.2], [0.6]], { ruleId: "r", rule: "radius", metric: "euclidean", radius: .3 }, algorithm);
  }
});
test("exact search retains source omission and normalized feature semantics", () => {
  const options = { ...base, missing: "omit-node", preprocess: "standardize" };
  compare(["a", "b", "c", "d", "e"], [[1, 1], [null, 1], [8, 1], [2, 1], [4, 1]], options, "kd-tree");
  for (const [keys, values] of [[[], []], [["a"], [[0]]]]) {
    for (const algorithm of ["kd-tree", "grid"]) {
      const result = compare(keys, values, { ruleId: "r", rule: "radius", metric: "euclidean", radius: 0 }, algorithm);
      assert.deepEqual(result.edges, []);
    }
    assert.equal(compare(keys, values, base, "kd-tree").effectiveK, 0);
  }
});
test("KD-tree prunes distance work without changing the exact graph", () => {
  const keys = Array.from({ length: 160 }, (_, i) => i), values = keys.map(i => [i * 10, i % 3]);
  const result = compare(keys, values, { ...base, k: 1 }, "kd-tree");
  assert.ok(result.search.distanceEvaluations < result.pairCount / 2);
  assert.ok(Object.isFrozen(result.search));
  assert.deepEqual(inferGraphNeighbors(keys, values, { ...base, search: search("brute-force") }).edges,
    inferGraphNeighbors(keys, values, base).edges);
});
test("exact search rejects inapplicable algorithms and descriptors without reading accessors", () => {
  const values = [[0], [1], [2]], keys = ["a", "b", "c"], before = structuredClone(values);
  for (const policy of [null, { mode: "wrong" }, { mode: "exact", algorithm: "unknown" },
    { mode: "exact", algorithm: "grid" }, { mode: "exact", algorithm: "kd-tree", seed: 3 }]) {
    assert.throws(() => inferGraphNeighbors(keys, values, { ...base, search: policy }));
  }
  assert.throws(() => inferGraphNeighbors(keys, values, { ...base, metric: "cosine", zeroVector: "zero-similarity", search: search("kd-tree") }), /Euclidean|euclidean/);
  assert.throws(() => inferGraphNeighbors(keys, keys.map(() => Array(9).fill(0)), { ...base, search: search("kd-tree") }), /dimension/);
  assert.throws(() => inferGraphNeighbors(keys, keys.map(() => Array(4).fill(0)), { ruleId: "r", rule: "radius", metric: "euclidean", radius: 1, search: search("grid") }), /dimension/);
  assert.throws(() => inferGraphNeighbors(keys, [[1e100], [2e100], [3e100]], { ruleId: "r", rule: "radius", metric: "euclidean", radius: 1, search: search("grid") }), /cell index/);
  let reads = 0;
  assert.throws(() => inferGraphNeighbors(keys, values, { ...base, search: { get mode() { reads++; return "exact"; } } }), /data properties/);
  assert.equal(reads, 0); assert.deepEqual(values, before);
});
test("accelerated search checks cumulative work and generated edges before further expansion", () => {
  const keys = Array.from({ length: 260 }, (_, i) => i), values = keys.map(() => Array(8).fill(0));
  assert.throws(() => inferGraphNeighbors(keys, values, { ...base, k: 1, search: search("kd-tree") }), /exact search work/);
  for (const algorithm of ["kd-tree", "grid"]) {
    const options = { ruleId: "r", rule: "radius", metric: "euclidean", radius: 0, search: search(algorithm) };
    assert.throws(() => inferGraphNeighbors(keys, keys.map(() => [0]), options), /neighbor edges/);
    assert.throws(() => inferGraphNeighbors(keys, keys.map(() => [0]), { ...options, directed: true }), /neighbor edges/);
  }
});
test("search defaults are exact and invalid optional values are not treated as omission", () => {
  const keys = ["a", "b", "c"], values = [[0], [1], [2]];
  assert.deepEqual(inferGraphNeighbors(keys, values, { ...base, search: {} }).search,
    { mode: "exact", algorithm: "brute-force", algorithmVersion: "brute-force@1", distanceEvaluations: 3 });
  for (const input of [{ mode: null }, { algorithm: null }]) assert.throws(() => inferGraphNeighbors(keys, values, { ...base, search: input }));
  assert.throws(() => inferGraphNeighbors(keys, values, { ruleId: "r", rule: "similarity", metric: "cosine", zeroVector: "zero-similarity", threshold: 0, search: search("kd-tree") }), /kNN or radius/);
});
