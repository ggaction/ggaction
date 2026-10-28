import test from "node:test";
import assert from "node:assert/strict";
import { encodeRowKey } from "../../../../src/core/itemIdentity.js";
import { resolveObservedGraphInput, resolveInferredGraphInput } from "../../../../src/grammar/graph/input.js";

const rows = [{ id: "a", x: 0, group: "g" }, { id: "b", x: 1, group: "g" }, { id: "c", x: 3, group: "h" }, { id: "d", x: 10, group: "h" }];
const tokens = new Map(rows.map(row => [encodeRowKey(row.id), row.id]));
const pairs = model => model.edges.map(edge => [tokens.get(edge.sourceKey), tokens.get(edge.targetKey), edge.weight]);
const observed = { nodeKey: "id", source: "from", target: "to" };
const inference = { nodeKey: "id", ruleId: "near", rule: "knn", features: ["x"], metric: "euclidean" };

test("observed table fields retain typed keys, zero weights and persisted parallel occurrence identity", () => {
  const nodes = [{ id: 1, label: "Number" }, { id: "1", label: "Text" }];
  const edges = [{ from: 1, to: "1", w: 0 }, { from: 1, to: "1", w: 2 }];
  const before = structuredClone({ nodes, edges });
  const first = resolveObservedGraphInput(nodes, edges, { ...observed, weight: "w", attributes: ["label"] }, ["edge-a", "edge-b"]);
  const reversed = resolveObservedGraphInput(nodes, [...edges].reverse(), { ...observed, weight: "w", attributes: ["label"] }, ["edge-b", "edge-a"]);
  assert.deepEqual(first.model.edges.map(edge => [edge.key, edge.weight]), reversed.model.edges.map(edge => [edge.key, edge.weight]).reverse());
  assert.notEqual(first.model.nodes[0].key, first.model.nodes[1].key);
  assert.deepEqual(first.model.nodes.map(node => node.attributes.label), ["Number", "Text"]);
  assert.deepEqual(first.options, { ...observed, weight: "w", attributes: ["label"], maxNodes: 10000, maxEdges: 10000, directed: false, selfLoops: false });
  assert.deepEqual({ nodes, edges }, before);
  assert.ok(Object.isFrozen(first.model.edges[0]));
});

test("observed compound fields and explicit edge keys do not depend on row order", () => {
  const nodes = [{ family: "a", n: 1 }, { family: "b", n: 2 }];
  const edges = [{ sf: "a", sn: 1, tf: "b", tn: 2, id: "edge" }];
  const output = resolveObservedGraphInput(nodes, edges, { nodeKey: ["family", "n"], source: ["sf", "sn"], target: ["tf", "tn"], edgeKey: "id", directed: true });
  assert.equal(output.model.edges[0].sourceKey, encodeRowKey(["a", 1]));
  assert.equal(output.model.edges[0].key, encodeRowKey("edge"));
  assert.equal(output.model.directed, true);
  const self = resolveObservedGraphInput([nodes[0]], [{ sf: "a", sn: 1, tf: "a", tn: 1, id: "self" }], { nodeKey: ["family", "n"], source: ["sf", "sn"], target: ["tf", "tn"], edgeKey: "id", selfLoops: true });
  assert.equal(self.model.edges.length, 1);
});

test("six inference adapters reproduce literal endpoint and weight expectations", () => {
  const run = patch => pairs(resolveInferredGraphInput(rows, { ...inference, ...patch }).model);
  assert.deepEqual(run({}), [["a", "b", 1], ["b", "a", 1], ["c", "b", 2], ["d", "c", 7]]);
  assert.deepEqual(run({ rule: "radius", options: { radius: 2 } }), [["a", "b", 1], ["b", "c", 2]]);
  assert.deepEqual(run({ rule: "mst" }), [["a", "b", 1], ["b", "c", 2], ["c", "d", 7]]);
  const group = resolveInferredGraphInput(rows, { nodeKey: "id", ruleId: "same", rule: "group", options: { fields: ["group"] } });
  assert.deepEqual(pairs(group.model), [["a", "b", 1], ["c", "d", 1]]);
  const sequence = resolveInferredGraphInput(rows, { nodeKey: "id", ruleId: "next", rule: "sequence", options: { orderField: "x" } });
  assert.deepEqual(pairs(sequence.model), [["a", "b", 1], ["b", "c", 1], ["c", "d", 1]]);
  assert.equal(sequence.model.directed, true);
  const similarity = resolveInferredGraphInput([{ id: "a", tags: [1, "x", 1] }, { id: "b", tags: ["x"] }, { id: "c", tags: [2] }], {
    ...inference, rule: "similarity", metric: "jaccard", features: { set: "tags" }, options: { threshold: 0.5 }
  });
  assert.deepEqual(pairs(similarity.model), [["a", "b", 0.5]]);
});

test("metric-specific fields retain omissions, statistics, search evidence and endpoint identity", () => {
  const data = [{ id: "a", x: 0 }, { id: "skip", x: null }, { id: "b", x: 1 }, { id: "c", x: 3 }];
  const first = resolveInferredGraphInput(data, { ...inference, preprocess: "minmax", options: { missing: "omit-node", search: { mode: "exact", algorithm: "kd-tree" } } });
  assert.deepEqual(first.model.nodes.map(node => node.sourceRows), [[0], [2], [3]]);
  assert.deepEqual(first.model.edges.map(edge => edge.sourceRows), [[0, 2], [2, 0], [3, 2]]);
  assert.deepEqual(first.inference.preparation.omitted, [{ index: 1, feature: 0, reason: "missing-value" }]);
  assert.equal(first.inference.preparation.statistics.length, 1);
  assert.equal(first.inference.search.algorithm, "kd-tree");
  const revised = resolveInferredGraphInput(data, { ...inference, options: { missing: "omit-node", k: 2 } });
  const revisedKeys = new Set(revised.model.edges.map(edge => edge.key));
  assert.ok(first.model.edges.every(edge => revisedKeys.has(edge.key)));
  const geographic = resolveInferredGraphInput([{ id: "a", lon: 0, lat: 0 }, { id: "b", lon: 1, lat: 0 }], {
    ...inference, metric: "great-circle", features: { longitude: "lon", latitude: "lat" }
  });
  assert.ok(Math.abs(geographic.model.edges[0].weight - 111195.0802335329) < 1e-7);
});

test("candidate MST consumes exact observed endpoints and preserves zero-weight connections", () => {
  const candidate = resolveObservedGraphInput(rows, [{ from: "a", to: "b", w: 0 }, { from: "b", to: "c", w: 2 }, { from: "c", to: "d", w: 7 }, { from: "a", to: "d", w: 10 }], { ...observed, weight: "w" }, ["ab", "bc", "cd", "ad"]).model;
  const result = resolveInferredGraphInput(rows, { nodeKey: "id", ruleId: "tree", rule: "mst" }, candidate);
  assert.deepEqual(pairs(result.model), [["a", "b", 0], ["b", "c", 2], ["c", "d", 7]]);
  assert.equal(result.inference.cost, 9);
  assert.deepEqual(result.model.nodes.map(node => node.sourceRows), [[0], [1], [2], [3]]);
  assert.ok(result.model.edges.every(edge => edge.origin === "inferred" && edge.ruleId === "tree"));
});

test("empty and singleton field sources preserve explicit no-edge policies", () => {
  assert.equal(resolveObservedGraphInput([], [], observed, []).model.nodes.length, 0);
  const empty = resolveInferredGraphInput([], inference);
  assert.equal(empty.inference.effectiveK, 0);
  assert.equal(resolveInferredGraphInput([rows[0]], inference).model.edges.length, 0);
  assert.equal(resolveInferredGraphInput([], { nodeKey: "id", ruleId: "next", rule: "sequence", options: { orderField: "x", groupBy: [] } }).model.nodes.length, 0);
});

test("structural grouping, missing fields and explicit stars retain original source indices", () => {
  const data = [...rows, { id: "missing" }];
  const groupOptions = { nodeKey: "id", ruleId: "group", rule: "group", options: { fields: ["group"], missing: "omit-node", mode: "star", hubs: [{ group: ["g"], key: "a" }, { group: ["h"], key: "c" }] } };
  const grouped = resolveInferredGraphInput(data, groupOptions);
  assert.deepEqual(pairs(grouped.model), [["a", "b", 1], ["c", "d", 1]]);
  assert.deepEqual(grouped.inference.omitted, [{ index: 4, reason: "missing-group" }]);
  const sequence = resolveInferredGraphInput(data, { nodeKey: "id", ruleId: "next", rule: "sequence", options: { groupBy: ["group"], orderField: "x", missing: "omit-node", maxGap: 3 } });
  assert.deepEqual(pairs(sequence.model), [["a", "b", 1]]);
  const sparse = resolveInferredGraphInput(data, { ...inference, options: { missing: "omit-node" } });
  assert.deepEqual(sparse.inference.preparation.omitted, [{ index: 4, feature: 0, reason: "missing-value" }]);
  const sets = resolveInferredGraphInput([{ id: "a", tags: [1] }, { id: "b", tags: [1] }, { id: "c" }], {
    ...inference, metric: "jaccard", features: { set: "tags" }, options: { missing: "omit-node" }
  });
  assert.equal(sets.model.nodes.length, 2);
});

test("inference field definitions reject rule conflicts and candidate-domain mismatches", () => {
  const group = { nodeKey: "id", ruleId: "group", rule: "group", options: { fields: ["group"] } };
  for (const patch of [{ metric: "euclidean" }, { preprocess: "none" }, { features: ["x"] }]) assert.throws(() => resolveInferredGraphInput(rows, { ...group, ...patch }));
  for (const extra of [{ groupBy: [] }, { orderField: "x" }, { unknown: 1 }]) assert.throws(() => resolveInferredGraphInput(rows, { ...group, options: { ...group.options, ...extra } }));
  for (const options of [{ fields: ["group"], orderField: "x" }, { orderField: ["x"] }, { orderField: "x", lag: undefined }]) {
    assert.throws(() => resolveInferredGraphInput(rows, { nodeKey: "id", ruleId: "next", rule: "sequence", options }));
  }
  const candidate = resolveObservedGraphInput(rows, [], observed, []).model;
  assert.throws(() => resolveInferredGraphInput(rows, inference, candidate));
  assert.throws(() => resolveInferredGraphInput(rows, { ...inference, rule: "mst" }, candidate));
  const mst = { nodeKey: "id", ruleId: "tree", rule: "mst", options: { forest: true } };
  const forest = resolveInferredGraphInput(rows, mst, candidate);
  assert.equal(forest.inference.components, 4);
  assert.throws(() => resolveInferredGraphInput(rows.slice(1), mst, candidate));
  assert.throws(() => resolveInferredGraphInput(rows, mst, { ...candidate, directed: true }));
  assert.throws(() => resolveInferredGraphInput(rows, { ...inference, maxEdges: 1 }));
  assert.throws(() => resolveInferredGraphInput([{ id: "a", tags: "invalid" }], { ...inference, metric: "jaccard", features: { set: "tags" } }));
});

test("field adapters reject ambiguous, inherited, inapplicable and unbounded inputs before returning a model", () => {
  const observedBad = [
    { ...observed, directed: null }, { ...observed, selfLoops: null }, { ...observed, attributes: null },
    { ...observed, nodeKey: [] }, { ...observed, nodeKey: ["id", "id"] }, { ...observed, nodeKey: "" },
    { ...observed, weight: ["x"] }, { ...observed, extra: 1 }, { ...observed, maxNodes: 0 },
    { ...observed, source: undefined }, { ...observed, attributes: Array.from({ length: 65 }, (_, i) => `c${i}`) }
  ];
  for (const options of observedBad) assert.throws(() => resolveObservedGraphInput(rows, [], options, []));
  assert.throws(() => resolveObservedGraphInput(rows, [{ from: "a", to: "b", w: undefined }], { ...observed, weight: "w" }, ["e"]));
  assert.throws(() => resolveObservedGraphInput(rows, [], { ...observed, edgeKey: "id" }, []));
  assert.throws(() => resolveObservedGraphInput(rows, [{ from: "a", to: "b" }], observed, []));
  assert.throws(() => resolveObservedGraphInput([{ x: 1 }], [], observed, []));
  assert.throws(() => resolveObservedGraphInput(Object.assign([], { extra: true }), [], observed, []));
  assert.throws(() => resolveObservedGraphInput(rows, [], { ...observed, maxNodes: 1 }, []));
  const bad = [
    { options: null }, { options: { ruleId: "other" } }, { options: { metric: "cosine" } }, { options: { rule: "radius" } },
    { features: {} }, { features: [] }, { features: ["x", "x"] }, { features: { set: "x" } },
    { rule: "unknown" }, { rule: "group", options: { fields: ["group"] } },
    { metric: "jaccard", features: { set: "x", extra: "id" } },
    { metric: "great-circle", features: { longitude: "x" } }
  ];
  for (const patch of bad) assert.throws(() => resolveInferredGraphInput(rows, { ...inference, ...patch }));
  let reads = 0;
  const accessor = { id: "a", get x() { reads++; return 1; } };
  assert.throws(() => resolveInferredGraphInput([accessor], inference));
  assert.equal(reads, 0);
});
