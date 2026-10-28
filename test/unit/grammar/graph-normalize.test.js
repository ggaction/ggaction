import assert from "node:assert/strict";
import test from "node:test";
import { normalizeObservedGraph } from "../../../src/grammar/graph/normalize.js";
import { graphNodes, graphEdges, nodeTokens, edgeTokens, directedAdjacency, undirectedAdjacency } from "../../oracles/graph.js";

const nodes = () => [{ key: "a" }, { key: "b" }];
const edge = patch => ({ key: "ab", sourceKey: "a", targetKey: "b", ...patch });
const normalize = (rows = nodes(), edges = [edge()], options = {}) => normalizeObservedGraph(rows, edges, { directed: true, ...options });

test("observed graph preserves literal typed identities, directed adjacency, lineage and weight zero", () => {
  for (const directed of [true, false]) {
    const model = normalizeObservedGraph(graphNodes, graphEdges, { directed });
    assert.deepEqual(model.nodes.map(node => node.key), nodeTokens);
    assert.deepEqual(model.edges.map(edge => edge.key), edgeTokens);
    assert.deepEqual(model.nodes.map(node => node.sourceRows), [[7], [1, 4], [2], [3]]);
    assert.deepEqual(model.edges.map(edge => edge.sourceRows), [[8], [1], [2]]);
    assert.deepEqual(model.edges.map(edge => edge.weight), [0, 2, -1]);
    assert.ok(model.edges.every(edge => edge.origin === "observed" && edge.ruleId === null && edge.directed === directed));
    assert.deepEqual(model.adjacency.map(entry => ({
      incoming: entry.incoming.map(key => edgeTokens.indexOf(key)), outgoing: entry.outgoing.map(key => edgeTokens.indexOf(key)),
      neighbors: entry.neighbors.map(key => nodeTokens.indexOf(key))
    })), directed ? directedAdjacency : undirectedAdjacency);
  }
});

test("observed graph accepts cycles, disconnected and empty input without inventing topology", () => {
  const empty = normalize([], []);
  assert.deepEqual(empty, { nodes: [], edges: [], directed: true, selfLoops: false, adjacency: [] });
  assert.equal(normalizeObservedGraph(graphNodes, graphEdges, { directed: false }).edges.length, 3);
  assert.deepEqual(normalize(nodes(), []).adjacency.map(node => node.neighbors), [[], []]);
});

test("observed graph preserves scalar and tuple type boundaries and snapshots Date keys", () => {
  const date = new Date(0), keys = [false, 1, 1n, "1", date, ["a|b", "c"], ["a", "b|c"], [1], "__proto__", "constructor"];
  const result = normalize(keys.map(key => ({ key })), keys.slice(1).map((key, index) => ({ key: [index, "edge"], sourceKey: false, targetKey: key })));
  assert.equal(new Set(result.nodes.map(node => node.key)).size, keys.length);
  assert.equal(result.nodes[4].key, '["scalar",[["date",0]]]');
  assert.equal(result.nodes[5].key, '["tuple",[["string","a|b"],["string","c"]]]');
  date.setTime(100);
  assert.equal(result.nodes[4].key, '["scalar",[["date",0]]]');
  assert.equal(normalize([{ key: -0 }, { key: 1 }], [{ key: 0, sourceKey: 0, targetKey: 1 }]).nodes[0].key, '["scalar",[["number",0]]]');
  assert.throws(() => normalize([{ key: -0 }, { key: 0 }], []), /unique/);
});

test("observed parallel edges require explicit distinct identities and occurrence tokens are never indexes", () => {
  const result = normalize(nodes(), [edge(), edge({ key: "parallel" }), { occurrenceKey: "persisted-7", sourceKey: "b", targetKey: "a" }]);
  assert.equal(result.edges.length, 3);
  assert.equal(result.edges[2].key, '["observed-occurrence","persisted-7"]');
  assert.equal(result.adjacency[0].outgoing.length, 2);
  assert.equal(result.adjacency[0].neighbors.length, 1);
  const reordered = normalize(nodes(), [{ occurrenceKey: "persisted-7", sourceKey: "b", targetKey: "a" }, edge()]);
  assert.equal(reordered.edges[0].key, result.edges[2].key);
  for (const edges of [[edge(), edge()], [{ sourceKey: "a", targetKey: "b" }], [edge({ occurrenceKey: "also" })],
    [{ occurrenceKey: "", sourceKey: "a", targetKey: "b" }], [{ occurrenceKey: 1, sourceKey: "a", targetKey: "b" }],
    [{ occurrenceKey: "x", sourceKey: "a", targetKey: "b" }, { occurrenceKey: "x", sourceKey: "b", targetKey: "a" }]]) {
    assert.throws(() => normalize(nodes(), edges));
  }
});

test("observed self edges are opt-in and appear once in each adjacency list", () => {
  for (const directed of [true, false]) {
    const model = normalize([{ key: "a" }], [edge({ sourceKey: "a", targetKey: "a" })], { directed, selfLoops: true });
    assert.deepEqual(model.adjacency[0].incoming, [model.edges[0].key]);
    assert.deepEqual(model.adjacency[0].outgoing, [model.edges[0].key]);
    assert.deepEqual(model.adjacency[0].neighbors, [model.nodes[0].key]);
    assert.throws(() => normalize([{ key: "a" }], [edge({ targetKey: "a" })], { directed }), /self edges/);
  }
});

test("observed graph rejects missing endpoints, invalid numeric weights and malformed typed keys", () => {
  assert.throws(() => normalize(nodes(), [edge({ targetKey: "missing" })]), /existing/);
  assert.throws(() => normalize(nodes(), [edge({ sourceKey: "missing" })]), /existing/);
  for (const weight of [null, NaN, Infinity, -Infinity, "1", false]) assert.throws(() => normalize(nodes(), [edge({ weight })]), /finite weight/);
  assert.equal(normalize().edges[0].weight, 1);
  for (const key of [null, undefined, NaN, Infinity, {}, [], [[1]], [null], new Date(NaN), Array(65).fill(1)]) {
    assert.throws(() => normalize([{ key }], []));
    assert.throws(() => normalize(nodes(), [edge({ key })]));
    assert.throws(() => normalize(nodes(), [edge({ sourceKey: key })]));
  }
});

test("observed graph rejects executable shapes without reading accessors", () => {
  let calls = 0;
  const getter = Object.defineProperty({}, "key", { enumerable: true, get() { calls++; return "a"; } });
  const getterArray = Object.defineProperty([], "0", { enumerable: true, get() { calls++; return { key: "a" }; } });
  for (const input of [null, {}, Array(1), getterArray, [getter], [Object.create({ key: "a" })], [{ key: "a", extra: 1 }]]) assert.throws(() => normalize(input, []));
  for (const input of [null, {}, Array(1), getterArray, [getter], [edge({ extra: 1 })]]) assert.throws(() => normalize(nodes(), input));
  const options = Object.defineProperty({}, "directed", { enumerable: true, get() { calls++; return true; } });
  assert.throws(() => normalizeObservedGraph([], [], options));
  assert.equal(calls, 0);
  assert.throws(() => normalize([{}], []));
  assert.throws(() => normalize(nodes(), [{ key: "a", sourceKey: "a" }]));
  assert.equal(normalize([{ key: "a", sourceRows: undefined, attributes: undefined }], [], { selfLoops: undefined }).nodes.length, 1);
  assert.equal(normalize(nodes(), [edge({ weight: undefined, sourceRows: undefined })]).edges[0].weight, 1);
  for (const options of [null, [], {}, { directed: null }, { directed: true, selfLoops: null }, { directed: true, extra: 1 },
    { directed: true, maxNodes: 0 }, { directed: true, maxEdges: null }]) assert.throws(() => normalizeObservedGraph([], [], options));
});

test("observed graph freezes owned results and preserves caller data after success and failure", () => {
  const shared = { tags: ["x", "y"], nested: { nullable: null, amount: 1n, missing: undefined } };
  const rows = [{ key: "a", sourceRows: [2], attributes: { shared, same: shared } }, { key: "b" }], edges = [edge({ sourceRows: [4] })];
  const before = structuredClone({ rows, edges }), model = normalize(rows, edges);
  assert.deepEqual({ rows, edges }, before);
  rows[0].sourceRows.push(7); shared.tags.push("z"); edges[0].sourceRows.push(9);
  assert.deepEqual(model.nodes[0].sourceRows, [2]); assert.deepEqual(model.nodes[0].attributes.shared.tags, ["x", "y"]);
  assert.deepEqual(model.edges[0].sourceRows, [4]);
  for (const value of [model, model.nodes, model.nodes[0], model.nodes[0].attributes, model.nodes[0].attributes.shared.tags,
    model.edges, model.edges[0], model.adjacency, model.adjacency[0].outgoing]) assert.ok(Object.isFrozen(value));
  const invalid = [edge({ targetKey: "absent" })], snapshot = structuredClone(invalid);
  assert.throws(() => normalize(nodes(), invalid)); assert.deepEqual(invalid, snapshot);
});

test("observed graph preflights node, edge, key and cumulative work before dense traversal", () => {
  for (const [rows, edges, options] of [[Array(10_001), [], {}], [nodes(), Array(10_001), {}], [nodes(), [], { maxNodes: 1 }],
    [nodes(), [edge(), edge({ key: "other" })], { maxEdges: 1 }]]) assert.throws(() => normalize(rows, edges, options), /must not exceed/);
  assert.throws(() => normalize([{ key: "x".repeat(10_000_001) }], []), /work/);
  assert.throws(() => normalize([{ key: ["x".repeat(10_000_001)] }], []), /work/);
  const many = Array.from({ length: 4000 }, (_, key) => ({ key: `${key}:${"a".repeat(600)}` }));
  assert.throws(() => normalize(many, []), /work/);
});
