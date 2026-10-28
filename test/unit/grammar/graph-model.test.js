import assert from "node:assert/strict";
import test from "node:test";
import { normalizeObservedGraph } from "../../../src/grammar/graph/normalize.js";
import { createGraphModel, graphLimits, indexGraphModel } from "../../../src/grammar/graph/model.js";

const model = () => normalizeObservedGraph([{ key: "a" }, { key: "b" }], [{ key: "ab", sourceKey: "a", targetKey: "b" }], { directed: true });
const changed = change => { const value = structuredClone(model()); change(value); return value; };
const reject = change => assert.throws(() => indexGraphModel(changed(change)));

test("graph model indexes canonical graph keys and validates exact stable adjacency", () => {
  const value = model(), indexed = indexGraphModel(value);
  assert.equal(indexed.nodes, value.nodes); assert.equal(indexed.edges, value.edges);
  assert.equal(indexed.nodeIndexes.get(value.nodes[1].key), 1);
  assert.equal(indexed.edgeIndexes.get(value.edges[0].key), 0);
  assert.ok(Number.isFinite(indexed.work) && indexed.work > 0);
  assert.equal(indexGraphModel(normalizeObservedGraph([], [], { directed: false })).work, 0);
  reject(value => { value.adjacency.pop(); });
  reject(value => { value.adjacency.reverse(); });
  reject(value => { value.adjacency[0].outgoing = []; });
  reject(value => { value.adjacency[0].outgoing[0] = "wrong"; });
  reject(value => { value.adjacency[0].neighbors.push(value.nodes[1].key); });
  reject(value => { value.adjacency[0].incoming = null; });
  reject(value => { value.adjacency[0].extra = true; });
  reject(value => { value.adjacency = {}; });
});

test("graph model validates normalized tokens, endpoint ownership, direction and origin", () => {
  for (const bad of [null, "", 1]) {
    reject(value => { value.nodes[0].key = bad; });
    reject(value => { value.edges[0].key = bad; });
  }
  reject(value => { value.nodes[1].key = value.nodes[0].key; });
  reject(value => { value.nodes[0].extra = 1; });
  reject(value => { delete value.nodes[0].sourceRows; });
  reject(value => { delete value.edges[0].weight; });
  reject(value => { delete value.adjacency[0].incoming; });
  reject(value => { delete value.directed; });
  reject(value => { value.edges[0].extra = 1; });
  reject(value => { value.edges.push(value.edges[0]); });
  reject(value => { value.edges[0].sourceKey = "unknown"; });
  reject(value => { value.edges[0].targetKey = "unknown"; });
  reject(value => { value.edges[0].directed = false; });
  reject(value => { value.edges[0].weight = NaN; });
  reject(value => { value.edges[0].ruleId = "rule"; });
  for (const origin of [undefined, null, "authored", false]) reject(value => { value.edges[0].origin = origin; });
  for (const ruleId of [null, 1, ""]) reject(value => { value.edges[0].origin = "inferred"; value.edges[0].ruleId = ruleId; });
  const base = model(), inferred = base.edges.map(edge => ({ ...edge, origin: "inferred", ruleId: "neighbors" }));
  const value = createGraphModel(base.nodes, inferred, { directed: true, selfLoops: false });
  assert.equal(indexGraphModel(value).edges[0].ruleId, "neighbors");
  assert.throws(() => createGraphModel(base.nodes, [{ ...inferred[0], targetKey: base.nodes[0].key }], { directed: true, selfLoops: true }), /self edges/);
});

test("graph model validates source membership and bounded plain-data attributes without accessors", () => {
  for (const sourceRows of [null, {}, [-1], [1, 1], [Infinity], [1.5], ["0"], Array(1)]) {
    reject(value => { value.nodes[0].sourceRows = sourceRows; });
    reject(value => { value.edges[0].sourceRows = sourceRows; });
  }
  for (const attributes of [null, [], new Date(0), { nested: new Map() }, { nested: () => 1 }, { nested: Symbol("x") }, { nested: Array(1) }]) {
    reject(value => { value.nodes[0].attributes = attributes; });
  }
  const cyclic = {}; cyclic.self = cyclic;
  reject(value => { value.nodes[0].attributes = cyclic; });
  let deep = {};
  for (let i = 0; i < 66; i++) deep = { next: deep };
  reject(value => { value.nodes[0].attributes = deep; });
  let calls = 0;
  const getter = Object.defineProperty({}, "field", { enumerable: true, get() { calls++; return 1; } });
  reject(value => { value.nodes[0].attributes = { nested: getter }; });
  const optionGetter = Object.defineProperty({}, "directed", { enumerable: true, get() { calls++; return true; } });
  assert.throws(() => createGraphModel([], [], optionGetter));
  assert.equal(calls, 0);
  const emptyRows = createGraphModel([{ key: "opaque", sourceRows: [], attributes: Object.assign(Object.create(null), { text: "x", nan: NaN, nil: null, flag: true }) }], [], { directed: false, selfLoops: false });
  assert.equal(indexGraphModel(emptyRows).nodes[0].attributes.text, "x");
});

test("graph model preflights limits and cumulative work without accepting malformed configuration", () => {
  for (const options of [null, [], { extra: 1 }, { maxNodes: null }, { maxEdges: 0 }, { maxNodes: -1 }, { maxNodes: 1.5 }, { maxEdges: Infinity }, { maxEdges: Number.MAX_SAFE_INTEGER + 1 }]) assert.throws(() => graphLimits(options));
  assert.deepEqual(graphLimits({ maxNodes: undefined, maxEdges: 1 }), { maxNodes: 10_000, maxEdges: 1 });
  assert.throws(() => createGraphModel([], [], {}));
  for (const patch of [{ directed: null }, { selfLoops: null }]) {
    assert.throws(() => createGraphModel([], [], { directed: true, selfLoops: false, ...patch }));
  }
  for (const prior of [-1, 1.5, Infinity, NaN]) assert.throws(() => createGraphModel([], [], { directed: false, selfLoops: false }, prior));
  assert.throws(() => createGraphModel([], [], { directed: false, selfLoops: false }, 10_000_001), /work/);
  assert.throws(() => createGraphModel(Array(10_001), [], { directed: false, selfLoops: false }), /must not exceed/);
  assert.throws(() => createGraphModel([], Array(10_001), { directed: false, selfLoops: false }), /must not exceed/);
  assert.throws(() => createGraphModel(null, [], { directed: false, selfLoops: false }));
  assert.throws(() => indexGraphModel({ ...model(), unknown: true }));
  assert.throws(() => indexGraphModel(null));
  reject(value => { value.nodes[0].attributes = { large: "x".repeat(10_000_000) }; });
  reject(value => { value.nodes[0].attributes = { large: Array(3_000_000) }; });
  reject(value => { value.nodes[0].sourceRows = Array(4_000_000); });
  const large = { key: "x".repeat(1_000_000), sourceRows: [], attributes: {} };
  assert.throws(() => createGraphModel([large], [], { directed: false, selfLoops: false }, 7_000_000), /work/);
});
