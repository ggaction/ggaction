import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHierarchyInput } from "../../../src/grammar/hierarchy/input.js";
import { normalizeHierarchyNodes } from "../../../src/grammar/hierarchy/normalize.js";
import { hierarchyRows, hierarchyInputFixtures } from "../../oracles/hierarchy.js";

const flat = { format: "flat", key: "id", parent: "parent", value: "v" };
const nested = { format: "nested", key: "id", children: "children", value: "v" };
const groups = { format: "groups", groupFields: ["continent", "country"], value: "v" };
const rawKey = key => JSON.parse(key)[1][0][1];

for (const { id, input, options, expected } of hierarchyInputFixtures) test(`independent ${id} hierarchy input fixture`, () => {
  const result = normalizeHierarchyInput(input, options);
  assert.deepEqual({ depth: result.nodes.map(node => node.depth), sourceRows: result.nodes.map(node => node.sourceRows),
    total: result.nodes.map(node => node.totalValue), own: result.nodes.map(node => node.ownValue) }, expected);
});

test("flat field lowering shares the exact typed topology and value normalizer", () => {
  const rows = hierarchyRows.map(({ key, parentKey, value }) => ({ id: key, parent: parentKey, v: value, unrelated: [1] }));
  for (const valueMode of ["leaf-sum", "inclusive", "own-plus-children"]) {
    assert.deepEqual(normalizeHierarchyInput(rows, { ...flat, valueMode }), normalizeHierarchyNodes(hierarchyRows, { valueMode }));
  }
  const missingOwn = [{ id: "root", parent: null }, { id: "child", parent: "root", v: 2 }];
  assert.equal(normalizeHierarchyInput(missingOwn, flat).totalValue, 2);
  assert.equal(normalizeHierarchyInput(missingOwn, { ...flat, valueMode: "own-plus-children" }).totalValue, 2);
  assert.equal(normalizeHierarchyInput([{ v: 2, parent: null }], { ...flat, key: "v" }).totalValue, 2);
});

test("nested lowering preserves original top-level row references and child order", () => {
  const rows = [{ id: "root", v: 100, children: [{ id: "A", children: [{ id: "A1", v: 2 }, { id: "A2", v: 4 }] }, { id: "B", v: 4, children: [] }] }];
  const before = structuredClone(rows), result = normalizeHierarchyInput(rows, nested);
  assert.deepEqual(result.nodes.map(node => rawKey(node.key)), ["root", "A", "A1", "A2", "B"]);
  assert.deepEqual(result.nodes.map(node => node.totalValue), [10, 6, 2, 4, 4]);
  assert.deepEqual(result.nodes.map(node => node.sourceRows), [[0], [0], [0], [0], [0]]);
  assert.deepEqual(rows, before);
  const forest = normalizeHierarchyInput([...rows, { id: "other", v: 3 }], { ...nested, forest: true });
  assert.deepEqual(forest.nodes.at(-1).sourceRows, [1]);
  assert.equal(forest.totalValue, 13);
});

test("nested lowering rejects object cycles and shared children before unbounded traversal", () => {
  const cyclic = { id: "root", v: 1 }; cyclic.children = [cyclic];
  const shared = { id: "leaf", v: 1 };
  for (const rows of [[cyclic], [{ id: "root", children: [shared, shared] }]]) {
    assert.throws(() => normalizeHierarchyInput(rows, nested), /cyclic or shared/);
  }
  assert.equal(cyclic.children[0], cyclic);
  assert.deepEqual(shared, { id: "leaf", v: 1 });
  const duplicate = [{ id: "root", children: [{ id: "x", v: 1 }, { id: "x", v: 2 }] }];
  assert.throws(() => normalizeHierarchyInput(duplicate, nested), /unique/);
});

test("group paths retain typed prefixes, aggregate duplicate leaves and preserve exact source rows", () => {
  const rows = [{ continent: "E", country: "A", v: 2 }, { continent: "E", country: "A", v: 4 },
    { continent: "E", country: "B", v: 0 }, { continent: "N", country: "C", v: 3 }];
  const before = structuredClone(rows), result = normalizeHierarchyInput(rows, groups);
  assert.deepEqual(result.nodes.map(node => node.totalValue), [9, 6, 6, 0, 3, 3]);
  assert.deepEqual(result.nodes.map(node => node.depth), [0, 1, 2, 2, 1, 2]);
  assert.deepEqual(result.nodes.map(node => node.sourceRows), [[], [0, 1, 2], [0, 1], [2], [3], [3]]);
  assert.equal(result.nodes[0].synthetic, true);
  assert.equal(new Set(result.nodes.map(node => node.key)).size, result.nodes.length);
  assert.deepEqual(rows, before);
  const reordered = normalizeHierarchyInput([...rows].reverse(), groups);
  assert.deepEqual(new Set(reordered.nodes.map(node => node.key)), new Set(result.nodes.map(node => node.key)));
  assert.notDeepEqual(reordered.nodes.map(node => node.key), result.nodes.map(node => node.key));
  assert.deepEqual(reordered.nodes.at(-1).sourceRows, [2, 3]);
  assert.equal(reordered.nodes.at(-1).totalValue, 6);
  assert.deepEqual(normalizeHierarchyInput([], groups).nodes, []);
  assert.equal(normalizeHierarchyInput([{ k: "A", v: 0 }], { ...groups, groupFields: ["k"] }).diagnostics.emptyValue, true);
});

test("group category identity does not coerce types or join ambiguous delimiters", () => {
  const values = [1, "1", true, 1n, new Date(0), null];
  const rows = values.map(k => ({ k, v: 1 }));
  const options = { format: "groups", groupFields: ["k"], value: "v", missingCategory: "include", valueMode: "leaf-sum" };
  const result = normalizeHierarchyInput(rows, options);
  assert.equal(result.nodes.length, 7);
  assert.equal(result.totalValue, 6);
  const dateKey = result.nodes[5].key;
  values[4].setTime(100);
  assert.equal(result.nodes[5].key, dateKey);
  const collision = normalizeHierarchyInput([{ a: "x/y", b: "z", v: 1 }, { a: "x", b: "y/z", v: 2 }],
    { format: "groups", groupFields: ["a", "b"], value: "v" });
  assert.equal(collision.nodes.length, 5);
  assert.deepEqual(collision.nodes.filter(node => node.depth === 2).map(node => node.totalValue), [1, 2]);
});

test("group paths reject invalid categories, weight overflow and mismatched modes atomically", () => {
  const options = { format: "groups", groupFields: ["k"], value: "v" };
  for (const k of [null, undefined, [], {}, NaN, Infinity, new Date(NaN)]) {
    assert.throws(() => normalizeHierarchyInput([{ k, v: 1 }], options));
  }
  for (const v of [undefined, null, NaN, Infinity, -1, "1"]) assert.throws(() => normalizeHierarchyInput([{ k: "a", v }], options));
  assert.throws(() => normalizeHierarchyInput([{ k: "a", v: Number.MAX_VALUE }, { k: "a", v: Number.MAX_VALUE }], options), /finite numeric/);
  assert.throws(() => normalizeHierarchyInput([], { ...options, missingCategory: "omit" }), /missingCategory/);
  assert.throws(() => normalizeHierarchyInput([], { ...options, valueMode: "inclusive" }), /leaf-sum/);
  assert.throws(() => normalizeHierarchyInput([{ v: 1 }], options), /own field/);
});

test("hierarchy adapters validate exact input roles and never read executable properties", () => {
  for (const options of [null, {}, { format: "constructor" }, { ...flat, extra: 1 }, { ...flat, key: "" },
    { ...groups, groupFields: [] },
    { ...groups, groupFields: ["x", "x"] }, { ...groups, groupFields: [""] }, { ...flat, value: "" }]) {
    assert.throws(() => normalizeHierarchyInput([], options));
  }
  for (const input of [null, {}, Array(1), [{ id: "x", v: 1 }]]) assert.throws(() => normalizeHierarchyInput(input, flat));
  assert.throws(() => normalizeHierarchyInput([{ id: "x", v: 1, children: null }], nested));
  let calls = 0;
  const row = Object.defineProperty({}, "id", { enumerable: true, get() { calls++; return "x"; } });
  assert.throws(() => normalizeHierarchyInput([row], flat));
  const options = Object.defineProperty({}, "format", { enumerable: true, get() { calls++; return "flat"; } });
  assert.throws(() => normalizeHierarchyInput([], options));
  assert.equal(calls, 0);
});

test("hierarchy adapter and normalized-node work share one cumulative budget", () => {
  assert.throws(() => normalizeHierarchyInput(Array(2_500_001), { ...flat, maxNodes: 3_000_000 }), /work/);
  assert.throws(() => normalizeHierarchyInput(Array(100), { ...flat, maxNodes: 1 }), /node count/);
  assert.throws(() => normalizeHierarchyInput([{ id: "r", children: Array(100) }], { ...nested, maxNodes: 2 }), /node count/);
  assert.throws(() => normalizeHierarchyInput([{ id: "root", children: [{ id: "child", v: 1 }] }], { ...nested, maxNodes: 1 }), /node count/);
  assert.throws(() => normalizeHierarchyInput([{ id: "a", parent: null, v: 1 }, { id: "b", parent: null, v: 1 }], { ...flat, forest: true, maxNodes: 1 }), /node count/);
  const key = "x".repeat(2_000_000);
  assert.throws(() => normalizeHierarchyInput([{ k: key, v: 1 }], { format: "groups", groupFields: ["k"], value: "v" }), /work/);
  assert.throws(() => normalizeHierarchyNodes([], {}, -1), /prior work/);
  assert.throws(() => normalizeHierarchyNodes([], {}, Infinity), /prior work/);
  assert.throws(() => normalizeHierarchyNodes([{ key: "r", parentKey: null, value: 1 }], {}, 10_000_000), /work/);
});

test("nested depth ten thousand is traversed iteratively without invented row indexes", () => {
  let current = { id: 10_000, v: 7 };
  for (let id = 9999; id >= 0; id--) current = { id, children: [current] };
  const result = normalizeHierarchyInput([current], { ...nested, maxNodes: 10_001 });
  assert.equal(result.nodes.at(-1).depth, 10_000);
  assert.equal(result.totalValue, 7);
  assert.ok(result.nodes.every(node => node.sourceRows.length === 1 && node.sourceRows[0] === 0));
});
