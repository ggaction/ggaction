import assert from "node:assert/strict";
import test from "node:test";
import { prepareGraphMetricVectors } from "../../../../src/grammar/graph/preprocess.js";
import { graphMetricPair } from "../../../../src/grammar/graph/metrics.js";
import { directPopulationColumns } from "../../../oracles/graphMetrics.js";
const prepare = (vectors, options = {}) => prepareGraphMetricVectors(vectors, { metric: "euclidean", ...options });
const close = (a, b) => assert.ok(Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test("standardization uses population statistics and maps constant columns to zero", () => {
  const rows = [[1, 8], [3, 8]], prepared = prepare(rows, { preprocess: "standardize" });
  close(prepared.vectors[0][0], -1);close(prepared.vectors[1][0], 1);
  assert.deepEqual(prepared.vectors.map(vector => vector[1]), [0, 0]);
  assert.deepEqual(prepared.sourceIndices, [0, 1]);
  assert.deepEqual(prepared.omitted, []);
  const reference = directPopulationColumns([[1, 8], [2, 8], [3, 8]]);
  const actual = prepare([[1, 8], [2, 8], [3, 8]], { preprocess: "standardize" });
  reference.forEach((column, index) => column.forEach((value, row) => close(actual.vectors[row][index], value)));
  const { scale, center, spread } = prepared.statistics[0];
  close(scale * center, 2);close(scale * spread, 1);
  assert.equal(prepared.statistics[1].spread, 0);
  assert.deepEqual(rows, [[1, 8], [3, 8]]);
  assert.ok(Object.isFrozen(prepared.vectors[0]));
});
test("minmax preserves unit interval and represents extreme spans without numeric overflow", () => {
  const scaled = prepare([[2, 4], [4, 4], [6, 4]], { preprocess: "minmax" }).vectors;
  close(scaled[1][0], 0.5);
  assert.deepEqual([scaled[0][0], scaled[2][0]], [0, 1]);
  assert.deepEqual(scaled.map(vector => vector[1]), [0, 0, 0]);
  for (const magnitude of [Number.MAX_VALUE, 1e-300, Number.MIN_VALUE]) {
    const rows = [[-magnitude], [magnitude]];
    assert.deepEqual(prepare(rows, { preprocess: "standardize" }).vectors, [[-1], [1]]);
    assert.deepEqual(prepare(rows, { preprocess: "minmax" }).vectors, [[0], [1]]);
  }
  assert.deepEqual(prepare([[0], [0]], { preprocess: "standardize" }).vectors, [[0], [0]]);
});
test("none copies feature values, empty input retains policy and singleton standardization is zero", () => {
  const rows = [[1, 2]], result = prepare(rows);
  rows[0][0] = 100;
  assert.deepEqual(result.vectors, [[1, 2]]);
  assert.deepEqual(result.statistics, []);
  assert.deepEqual(prepare([], { preprocess: "standardize" }).vectors, []);
  assert.deepEqual(prepare([[2, 4]], { preprocess: "standardize" }).vectors, [[0, 0]]);
});
test("omission records original node indexes and causes without silently imputing", () => {
  const rows = [[1, 2], [null, 3], [4, undefined], [NaN, 7], [9, 10]];
  assert.throws(() => prepare(rows), /Missing graph feature at node 1, feature 0/);
  const result = prepare(rows, { missing: "omit-node" });
  assert.deepEqual(result.vectors, [[1, 2], [9, 10]]);
  assert.deepEqual(result.sourceIndices, [0, 4]);
  assert.deepEqual(result.omitted, [
    { index: 1, feature: 0, reason: "missing-value" },
    { index: 2, feature: 1, reason: "missing-value" },
    { index: 3, feature: 0, reason: "missing-value" }
  ]);
  assert.deepEqual(prepare([[null]], { missing: "omit-node", preprocess: "minmax" }).statistics, []);
  for (const row of [[null, Infinity], [null, "1"]]) {
    assert.throws(() => prepare([row], { missing: "omit-node" }), /finite numbers/);
  }
});
test("Jaccard typed sets and raw geodetic coordinates bypass numeric preprocessing", () => {
  const result = prepare([[1, "1", 1, new Date(0)], [new Date(0)]], { metric: "jaccard" });
  assert.equal(result.vectors[0].length, 3);
  assert.equal(graphMetricPair(...result.vectors, { metric: "jaccard" }).similarity, 1 / 3);
  assert.deepEqual(prepare([[540, 45]], { metric: "great-circle" }).vectors, [[540, 45]]);
  assert.deepEqual(prepare([[null, 45]], { metric: "great-circle", missing: "omit-node" }).sourceIndices, []);
  for (const metric of ["jaccard", "great-circle"]) {
    assert.throws(() => prepare([], { metric, preprocess: "standardize" }), /numeric vector/);
  }
  assert.throws(() => prepare([[null, 91]], { metric: "great-circle", missing: "omit-node" }), /latitude/);
});
test("cosine zero policy is checked after preprocessing, including constant columns", () => {
  assert.throws(() => prepare([[3], [3]], { metric: "cosine", preprocess: "standardize" }), /nonzero/);
  assert.deepEqual(prepare([[3], [3]], { metric: "cosine", preprocess: "standardize", zeroVector: "zero-similarity" }).vectors, [[0], [0]]);
  assert.deepEqual(prepare([[3], [4]], { metric: "cosine" }).vectors, [[3], [4]]);
});
test("preprocessing rejects invalid policies, structural input and unbounded allocations before work", () => {
  for (const options of [{ preprocess: null }, { preprocess: "other" }, { missing: null }, { missing: "impute" }, { extra: 1 }]) {
    assert.throws(() => prepare([], options), /Unsupported|Unknown/);
  }
  assert.throws(() => prepare([[1], [2, 3]]), /dimensions/);
  assert.throws(() => prepare([[null], [2, 3]], { missing: "omit-node" }), /dimensions/);
  assert.throws(() => prepare([[]]), /must not be empty/);
  assert.throws(() => prepare(new Array(10001)), /must not exceed/);
  assert.throws(() => prepare([new Array(1250001)]), /must not exceed/);
  assert.throws(() => prepare([new Array(1)]), /dense/);
  assert.throws(() => prepare([{}]), /ordinary array/);
  assert.throws(() => prepare({}, {}), /ordinary array/);
});
