import assert from "node:assert/strict";
import test from "node:test";
import { inferGraphNeighbors } from "../../../../src/grammar/graph/neighbors.js";
import { directNearestEdges } from "../../../oracles/graphNeighbors.js";
const options = { ruleId: "r", rule: "knn", metric: "euclidean" };
const keys = ["a", "b", "c", "d"], vectors = [[0], [1], [3], [10]];
const pairs = (result, names = keys) => result.edges.map(edge => [names[edge.sourceIndex], names[edge.targetIndex], edge.weight]);

test("exact kNN directed, union and mutual match independent literal neighborhoods", () => {
  for (const [symmetrize, expected] of [["directed", [["a", "b", 1], ["b", "a", 1], ["c", "b", 2], ["d", "c", 7]]],
    ["union", [["a", "b", 1], ["b", "c", 2], ["c", "d", 7]]], ["mutual", [["a", "b", 1]]]]) {
    const result = inferGraphNeighbors(keys, vectors, { ...options, symmetrize });
    assert.deepEqual(pairs(result), expected);
    assert.equal(result.pairCount, 6); assert.equal(result.effectiveK, 1);
    assert.deepEqual(pairs(result), directNearestEdges(keys.map((key, i) => ({ key, x: vectors[i][0] })), 1, symmetrize));
  }
});
test("seeded exact neighbors match an independent brute-force oracle", () => {
  let state = 12345;
  for (let fixture = 0; fixture < 100; fixture++) {
    const rows = Array.from({ length: 8 }, (_, i) => ({ key: `n${i}`, x: ((state = (1664525 * state + 1013904223) >>> 0) % 30) - 15 }));
    for (const mode of ["directed", "union", "mutual"]) {
      const names = rows.map(row => row.key);
      assert.deepEqual(pairs(inferGraphNeighbors(names, rows.map(row => [row.x]), { ...options, k: 3, symmetrize: mode }), names), directNearestEdges(rows, 3, mode));
    }
  }
});
test("radius is inclusive, directed thresholds emit both orientations and zero edges remain", () => {
  assert.deepEqual(pairs(inferGraphNeighbors(keys, vectors, { ruleId: "r", rule: "radius", metric: "euclidean", radius: 2 })), [["a", "b", 1], ["b", "c", 2]]);
  assert.deepEqual(pairs(inferGraphNeighbors(keys.slice(0, 3), [[0], [0], [2]], { ...options })), [["a", "b", 0], ["b", "a", 0], ["c", "a", 2]]);
  const zero = inferGraphNeighbors(keys.slice(0, 3), [[0], [0], [2]], { ruleId: "r", rule: "radius", metric: "euclidean", radius: 0, directed: true });
  assert.deepEqual(pairs(zero), [["a", "b", 0], ["b", "a", 0]]);
});
test("similarity uses inclusive metric-domain thresholds including negative cosine", () => {
  const result = inferGraphNeighbors(["a", "b"], [[1, 0], [-1, 0]], { ruleId: "r", rule: "similarity", metric: "cosine", threshold: -1, directed: true });
  assert.deepEqual(pairs(result), [["a", "b", -1], ["b", "a", -1]]);
  assert.equal(inferGraphNeighbors(["a", "b"], [[1, 0], [-1, 0]], { ruleId: "r", rule: "similarity", metric: "cosine", threshold: 0 }).edges.length, 0);
  assert.equal(inferGraphNeighbors(["a", "b"], [[], []], { ruleId: "r", rule: "similarity", metric: "jaccard", threshold: 1 }).edges[0].weight, 1);
  assert.equal(inferGraphNeighbors(["a", "b"], [[1], ["1"]], { ruleId: "r", rule: "similarity", metric: "jaccard", threshold: 0 }).edges[0].weight, 0);
});
test("typed keys break ties, survive reordering, and keep rule-scoped edge identities", () => {
  const names = ["origin", "1", 1, false];
  const data = [[0], [-1], [1], [1]];
  const result = inferGraphNeighbors(names, data, options);
  assert.equal(result.edges.find(edge => edge.sourceIndex === 0).targetIndex, 3);
  const reordered = inferGraphNeighbors([...names].reverse(), [...data].reverse(), options);
  assert.deepEqual(result.edges.map(({ key, weight }) => ({ key, weight })), reordered.edges.map(({ key, weight }) => ({ key, weight })));
  const revised = inferGraphNeighbors(names, data, { ...options, k: 2 });
  assert.ok(result.edges.every(edge => revised.edges.some(other => other.key === edge.key)));
  assert.ok(result.edges.every(edge => !inferGraphNeighbors(names, data, { ...options, ruleId: "other" }).edges.some(other => other.key === edge.key)));
});
test("empty, singleton and omitted nodes use effective k zero without inventing edges", () => {
  for (const [names, values] of [[[], []], [["a"], [[0]]], [["a"], [[null]]]]) {
    const result = inferGraphNeighbors(names, values, { ...options, missing: "omit-node", k: 10 });
    assert.equal(result.effectiveK, 0); assert.deepEqual(result.edges, []);
  }
  const result = inferGraphNeighbors(keys, [[0], [null], [3], [10]], { ...options, missing: "omit-node", preprocess: "minmax" });
  assert.deepEqual(result.preparation.sourceIndices, [0, 2, 3]);
  assert.deepEqual(result.preparation.omitted, [{ index: 1, feature: 0, reason: "missing-value" }]);
  assert.equal(result.edges.find(edge => edge.sourceIndex === 0).targetIndex, 2);
  assert.ok(Object.isFrozen(result.edges[0]));
});
test("invalid and inapplicable options fail without changing caller inputs", () => {
  const before = structuredClone(vectors);
  for (const patch of [{ k: 4 }, { k: 0 }, { k: 1.5 }, { k: null }, { symmetrize: null }, { radius: 1 }, { directed: true }, { rule: "mst" }, { ruleId: "" }]) {
    assert.throws(() => inferGraphNeighbors(keys, vectors, { ...options, ...patch }));
  }
  for (const patch of [{ radius: -1 }, { radius: Infinity }, { directed: null }, { k: 1 }]) {
    assert.throws(() => inferGraphNeighbors(keys, vectors, { ruleId: "r", rule: "radius", metric: "euclidean", radius: 1, ...patch }));
  }
  for (const patch of [{ threshold: -0.1 }, { threshold: 1.1 }, { metric: "euclidean" }]) {
    assert.throws(() => inferGraphNeighbors(keys, vectors, { ruleId: "r", rule: "similarity", metric: "jaccard", threshold: 0.5, ...patch }));
  }
  assert.throws(() => inferGraphNeighbors([1, 1], [[0], [1]], options), /unique/);
  assert.throws(() => inferGraphNeighbors([1], [], options), /equal length/);
  assert.throws(() => inferGraphNeighbors([null], [[0]], options), /Row keys/);
  assert.deepEqual(vectors, before);
});
test("exact work and generated edge limits are enforced before unbounded pair allocation", () => {
  const n = 1000, names = Array.from({ length: n }, (_, i) => i), data = names.map(i => [i]);
  assert.throws(() => inferGraphNeighbors(names, data, options), /exact neighbor work/);
  const smallNames = names.slice(0, 150), smallData = data.slice(0, 150);
  assert.throws(() => inferGraphNeighbors(smallNames, smallData, { ...options, k: 100 }), /neighbor edges/);
  assert.throws(() => inferGraphNeighbors(smallNames, smallData, { ruleId: "r", rule: "radius", metric: "euclidean", radius: 1000 }), /neighbor edges/);
  assert.throws(() => inferGraphNeighbors(Array(10001), [], options), /neighbor nodes/);
});

test("metric choice and resolved preprocessing retain threshold semantics", () => {
  const radius = { ruleId: "r", rule: "radius", radius: 5 };
  assert.equal(inferGraphNeighbors(["a", "b"], [[0, 0], [3, 4]], { ...radius, metric: "euclidean" }).edges.length, 1);
  assert.equal(inferGraphNeighbors(["a", "b"], [[0, 0], [3, 4]], { ...radius, metric: "manhattan" }).edges.length, 0);
  const geo = inferGraphNeighbors(["a", "b"], [[0, 0], [90, 0]], { ...radius, metric: "great-circle", radius: 10007557.221017962 });
  assert.equal(geo.edges.length, 1);
  assert.ok(Math.abs(geo.edges[0].weight - 10007557.221017962) < 1e-8);
  const zero = inferGraphNeighbors(["a", "b"], [[0], [1]], { ruleId: "r", rule: "similarity", metric: "cosine", threshold: 0, zeroVector: "zero-similarity" });
  assert.equal(zero.edges[0].weight, 0);
  assert.equal(zero.options.preprocess, "none"); assert.equal(zero.options.missing, "error");
  assert.equal(zero.options.zeroVector, "zero-similarity");
  const scaled = pairs(inferGraphNeighbors(keys, vectors, { ...radius, radius: .2, metric: "euclidean", preprocess: "minmax" }));
  assert.deepEqual(scaled.map(edge => edge.slice(0, 2)), [["a", "b"], ["b", "c"]]);
  scaled.forEach((edge, i) => assert.ok(Math.abs(edge[2] - [.1, .2][i]) < 1e-12));
});
test("untrusted descriptors and oversized arrays are rejected before feature evaluation", () => {
  let reads = 0;
  const accessor = { ...options, get k() { reads++; return 1; } };
  assert.throws(() => inferGraphNeighbors(keys, vectors, accessor), /data properties/);
  assert.throws(() => inferGraphNeighbors([], Array(10001), options), /feature nodes/);
  assert.throws(() => inferGraphNeighbors([], null, options), /array/);
  assert.throws(() => inferGraphNeighbors(null, [], options), /array/);
  assert.throws(() => inferGraphNeighbors(keys, vectors, null), /plain object/);
  assert.equal(reads, 0);
});
