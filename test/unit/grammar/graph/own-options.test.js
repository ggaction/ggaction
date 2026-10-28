import assert from "node:assert/strict";
import test from "node:test";
import { graphMetricPair } from "../../../../src/grammar/graph/metrics.js";
import { prepareGraphMetricVectors } from "../../../../src/grammar/graph/preprocess.js";
import { inferGraphNeighbors } from "../../../../src/grammar/graph/neighbors.js";
import { inferredGraphEdgeIdentity } from "../../../../src/grammar/graph/edgeIdentity.js";
import { inferGraphMst } from "../../../../src/grammar/graph/spanning.js";

function inherited(name, value, run) {
  let reads = 0;
  Object.defineProperty(Object.prototype, name, { configurable: true, get() { reads++; return value; } });
  try { run(); } finally { delete Object.prototype[name]; }
  assert.equal(reads, 0, `Inherited ${name} must never be evaluated.`);
}

test("required graph options cannot be supplied by inherited getters", () => {
  inherited("metric", "euclidean", () => {
    assert.throws(() => graphMetricPair([0], [1], {}), /metric/);
    assert.throws(() => prepareGraphMetricVectors([[0]], {}), /metric/);
  });
  inherited("rule", "knn", () => assert.throws(() => inferGraphNeighbors([1, 2], [[0], [1]], { ruleId: "r", metric: "euclidean" }), /require/));
  for (const [field, value] of [["ruleId", "r"], ["sourceKey", "a"], ["targetKey", "b"], ["directed", false]]) {
    const options = { ruleId: "r", sourceKey: "a", targetKey: "b", directed: false };
    delete options[field];
    inherited(field, value, () => assert.throws(() => inferredGraphEdgeIdentity(options)));
  }
});

test("omitted graph options retain defaults without inherited getter reads", () => {
  inherited("zeroVector", "zero-similarity", () => {
    assert.throws(() => graphMetricPair([0], [1], { metric: "cosine" }), /nonzero/);
    assert.equal(inferGraphNeighbors([1, 2], [[0], [1]], { ruleId: "r", rule: "knn", metric: "euclidean" }).edges.length, 2);
    assert.equal(inferGraphMst([1, 2], [[0], [1]], { ruleId: "r", metric: "euclidean" }).cost, 1);
  });
  inherited("preprocess", "minmax", () => assert.deepEqual(prepareGraphMetricVectors([[0], [10]], { metric: "euclidean" }).vectors, [[0], [10]]));
  inherited("missing", "omit-node", () => assert.throws(() => prepareGraphMetricVectors([[null]], { metric: "euclidean" }), /Missing/));
  inherited("k", 99, () => assert.equal(inferGraphNeighbors([1, 2], [[0], [1]], { ruleId: "r", rule: "knn", metric: "euclidean" }).effectiveK, 1));
  inherited("symmetrize", "union", () => assert.equal(inferGraphNeighbors([1, 2], [[0], [1]], { ruleId: "r", rule: "knn", metric: "euclidean" }).edges.length, 2));
  inherited("directed", true, () => assert.equal(inferGraphNeighbors([1, 2], [[0], [1]], { ruleId: "r", rule: "radius", metric: "euclidean", radius: 1 }).edges.length, 1));
});
