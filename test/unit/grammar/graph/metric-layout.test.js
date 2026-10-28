import assert from "node:assert/strict";
import test from "node:test";
import { inferGraphNeighbors } from "../../../../src/grammar/graph/neighbors.js";
import { inferGraphMst } from "../../../../src/grammar/graph/spanning.js";
import { normalizeObservedGraph } from "../../../../src/grammar/graph/normalize.js";
import { createGraphModel, indexGraphModel } from "../../../../src/grammar/graph/model.js";
import { layoutGraphCircular, layoutGraphFixed } from "../../../../src/grammar/graph/layout.js";

for (const method of ["neighbors", "mst"]) test(`${method} typed identities remain opaque in graph model and fixed/circular layout`, () => {
  const keys = [1, "1", ["a", 1], new Date(0)], vectors = [[0], [1], [3], [10]], ruleId = "nearby";
  const source = normalizeObservedGraph(keys.map((key, i) => ({ key, sourceRows: [i], attributes: { label: String(i) } })), [], { directed: false });
  const inferred = method === "mst" ? inferGraphMst(keys, vectors, { ruleId, metric: "euclidean" })
    : inferGraphNeighbors(keys, vectors, { ruleId, rule: "knn", k: 1, symmetrize: "union", metric: "euclidean" });
  // Only the test supplies explicit provenance. Production resource/field adapters remain separate.
  const edges = inferred.edges.map(({ sourceIndex, targetIndex, ...edge }) => ({ ...edge, origin: "inferred", ruleId, sourceRows: [sourceIndex, targetIndex] }));
  const model = createGraphModel(source.nodes, edges, { directed: false, selfLoops: false }), before = JSON.stringify(model);
  assert.equal(new Set(model.nodes.map(node => node.key)).size, 4);
  assert.deepEqual(model.edges.map(edge => edge.key), inferred.edges.map(edge => edge.key));
  assert.deepEqual(model.edges.map(edge => edge.weight).sort((a, b) => a - b), [1, 2, 7]);
  const indexed = indexGraphModel(model);
  for (const edge of model.edges) {
    assert.ok(indexed.nodeIndexes.has(edge.sourceKey)); assert.ok(indexed.nodeIndexes.has(edge.targetKey));
    assert.equal(edge.origin, "inferred"); assert.equal(edge.ruleId, ruleId);
  }
  const positions = source.nodes.map(({ key }, i) => ({ key, x: i - 2, y: i * 3 }));
  assert.deepEqual(layoutGraphFixed(model, [...positions].reverse()).nodes, positions);
  const circular = layoutGraphCircular(model, { center: [10, 20], radius: 5, startAngle: 0 });
  assert.deepEqual(circular.nodes.map(node => node.key), source.nodes.map(node => node.key));
  const expected = [[10, 15], [15, 20], [10, 25], [5, 20]];
  circular.nodes.forEach((node, i) => {
    assert.ok(Math.abs(node.x - expected[i][0]) < 1e-12); assert.ok(Math.abs(node.y - expected[i][1]) < 1e-12);
  });
  assert.equal(JSON.stringify(model), before);
  assert.ok(Object.isFrozen(model.adjacency)); assert.ok(Object.isFrozen(circular.nodes));
});
