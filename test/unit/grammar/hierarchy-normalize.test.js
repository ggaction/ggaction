import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHierarchyNodes } from "../../../src/grammar/hierarchy/normalize.js";
import { hierarchyRows, hierarchyExpected } from "../../oracles/hierarchy.js";

const rawKey = token => JSON.parse(token)[1][0][1];
const root = value => [{ key: "root", parentKey: null, value }];

test("hierarchy values follow independent literal totals and stable sibling preorder in all modes", () => {
  for (const valueMode of ["leaf-sum", "inclusive", "own-plus-children"]) {
    const result = normalizeHierarchyNodes(hierarchyRows, { valueMode });
    assert.deepEqual(result.nodes.map(node => rawKey(node.key)), hierarchyExpected.order);
    assert.deepEqual(result.nodes.map(node => node.depth), hierarchyExpected.depth);
    assert.deepEqual(result.nodes.map(node => node.sourceRows), hierarchyExpected.sourceRows);
    assert.deepEqual(result.nodes.map(node => node.totalValue), hierarchyExpected[valueMode].total);
    assert.deepEqual(result.nodes.map(node => node.ownValue), hierarchyExpected[valueMode].own);
    assert.deepEqual(result.nodes.map(node => node.residual), hierarchyExpected[valueMode].own);
    assert.equal(result.totalValue, hierarchyExpected[valueMode].total[0]);
    assert.equal(result.rootKey, result.nodes[0].key);
    for (const node of result.nodes) for (const childKey of node.childrenKeys) {
      assert.equal(result.nodes.find(child => child.key === childKey).parentKey, node.key);
    }
  }
});

test("hierarchy inclusive residual and ignored internal values preserve authored meaning", () => {
  const rows = [{ key: "r", parentKey: null, value: 10 }, { key: "a", parentKey: "r", value: 6 }];
  const inclusive = normalizeHierarchyNodes(rows, { valueMode: "inclusive" });
  assert.equal(inclusive.nodes[0].residual, 4);
  assert.equal(inclusive.nodes.length, 2);
  const leaf = normalizeHierarchyNodes(rows);
  assert.equal(leaf.totalValue, 6);
  assert.deepEqual(leaf.diagnostics.ignoredInternalValues, [{ key: leaf.rootKey, value: 10 }]);
  assert.equal(normalizeHierarchyNodes([{ key: "r", parentKey: null }, rows[1]], { valueMode: "own-plus-children" }).totalValue, 6);
  assert.equal(normalizeHierarchyNodes([{ key: "r", parentKey: null }, rows[1]]).totalValue, 6);
  assert.throws(() => normalizeHierarchyNodes([{ ...rows[0], value: 5 }, rows[1]], { valueMode: "inclusive" }), /exceeds/);
  assert.throws(() => normalizeHierarchyNodes([{ key: "r", parentKey: null }, rows[1]], { valueMode: "inclusive" }), /required/);
});

test("hierarchy preserves typed scalar identity and normalizes dates without retaining mutable keys", () => {
  const date = new Date(0), keys = [true, 1, 1n, "1", date, "__proto__", "constructor"];
  const rows = keys.map(key => ({ key, parentKey: null, value: 1 }));
  const result = normalizeHierarchyNodes(rows, { forest: true });
  assert.equal(new Set(result.nodes.map(node => node.key)).size, 8);
  assert.equal(result.totalValue, 7);
  date.setTime(1);
  assert.equal(result.nodes[5].key, '["scalar",[["date",0]]]');
  const zero = normalizeHierarchyNodes([{ key: -0, parentKey: null, value: 0 }, { key: "child", parentKey: 0, value: 2 }]);
  assert.equal(zero.nodes[1].parentKey, zero.rootKey);
  assert.throws(() => normalizeHierarchyNodes([{ key: -0, parentKey: null, value: 1 }, { key: 0, parentKey: null, value: 2 }]), /unique/);
});

test("hierarchy handles empty, root-only, zero weight and explicit forests without invented visible nodes", () => {
  for (const options of [{}, { forest: true }]) {
    const result = normalizeHierarchyNodes([], options);
    assert.equal(result.rootKey, null);
    assert.deepEqual(result.nodes, []);
    assert.equal(result.diagnostics.emptyHierarchy, true);
  }
  const zero = normalizeHierarchyNodes(root(0));
  assert.equal(zero.nodes.length, 1);
  assert.equal(zero.diagnostics.emptyValue, true);
  assert.equal(zero.diagnostics.emptyHierarchy, false);
  const forest = normalizeHierarchyNodes([{ key: '["hierarchy-root"]', parentKey: null, value: 1 }, { key: false, parentKey: null, value: 2 }], { forest: true });
  assert.equal(forest.nodes[0].synthetic, true);
  assert.deepEqual(forest.nodes[0].sourceRows, []);
  assert.equal(forest.nodes[0].totalValue, 3);
  assert.equal(forest.nodes[0].childrenKeys.length, 2);
  assert.ok(forest.nodes.slice(1).every(node => node.depth === 1 && node.parentKey === forest.rootKey));
  assert.equal(new Set(forest.nodes.map(node => node.key)).size, 3);
});

test("hierarchy validates topology independent of input order and rejects cycles, orphans and duplicates", () => {
  const reordered = [hierarchyRows[4], hierarchyRows[3], hierarchyRows[2], hierarchyRows[1], hierarchyRows[0]];
  assert.deepEqual(normalizeHierarchyNodes(reordered).nodes.map(node => rawKey(node.key)), ["root", "B", "A", "A2", "A1"]);
  const invalid = [
    [{ key: "a", parentKey: "a", value: 1 }],
    [{ key: "a", parentKey: "missing", value: 1 }],
    [{ key: "a", parentKey: "b", value: 1 }, { key: "b", parentKey: "a", value: 1 }],
    [...root(1), { key: "a", parentKey: "b", value: 1 }, { key: "b", parentKey: "a", value: 1 }],
    [...root(1), { key: "other", parentKey: null, value: 1 }],
    [...root(1), ...root(2)]
  ];
  for (const rows of invalid) {
    const before = structuredClone(rows);
    assert.throws(() => normalizeHierarchyNodes(rows));
    assert.deepEqual(rows, before);
  }
});

test("hierarchy validates all weights including ignored internal weights and detects finite overflow", () => {
  for (const value of [-1, NaN, Infinity, -Infinity, null, undefined, "1"]) {
    assert.throws(() => normalizeHierarchyNodes(root(value)), /weights/);
    assert.throws(() => normalizeHierarchyNodes([{ key: "root", parentKey: null, value }, { key: "child", parentKey: "root", value: 1 }]), /weights/);
  }
  assert.throws(() => normalizeHierarchyNodes([{ key: "root", parentKey: null }]), /required/);
  assert.throws(() => normalizeHierarchyNodes([{ key: "root", parentKey: null },
    { key: "a", parentKey: "root", value: Number.MAX_VALUE }, { key: "b", parentKey: "root", value: Number.MAX_VALUE }]), /finite numeric/);
  assert.throws(() => normalizeHierarchyNodes([{ key: "root", parentKey: null, value: Number.MAX_VALUE },
    { key: "a", parentKey: "root", value: Number.MAX_VALUE }], { valueMode: "own-plus-children" }), /finite numeric/);
  assert.throws(() => normalizeHierarchyNodes([{ key: "a", parentKey: null, value: Number.MAX_VALUE },
    { key: "b", parentKey: null, value: Number.MAX_VALUE }], { forest: true }), /finite numeric/);
});

test("hierarchy owns caller arrays and source membership and deeply freezes a flat normalized result", () => {
  const rows = [{ key: "r", parentKey: null, value: 1, sourceRows: [7, 2] }];
  const options = { valueMode: "inclusive" }, before = structuredClone(rows);
  const result = normalizeHierarchyNodes(rows, options);
  assert.deepEqual(rows, before);
  rows[0].sourceRows.push(9); rows[0].value = 30; options.valueMode = "leaf-sum";
  assert.deepEqual(result.nodes[0].sourceRows, [7, 2]);
  assert.equal(result.totalValue, 1);
  assert.equal(result.valueMode, "inclusive");
  for (const value of [result, result.nodes, result.nodes[0], result.nodes[0].childrenKeys,
    result.nodes[0].sourceRows, result.diagnostics, result.diagnostics.ignoredInternalValues]) assert.ok(Object.isFrozen(value));
});

test("hierarchy rejects executable or malformed input without running accessors", () => {
  let calls = 0;
  const getter = Object.defineProperty({}, "key", { enumerable: true, get() { calls++; return "x"; } });
  const array = Object.defineProperty([], "0", { enumerable: true, get() { calls++; return root(1)[0]; } });
  for (const rows of [null, {}, [getter], array, Array(1), [Object.create({ key: "x" })], [{}], [{ key: "x" }], [{ ...root(1)[0], extra: 1 }]]) {
    assert.throws(() => normalizeHierarchyNodes(rows));
  }
  const options = Object.defineProperty({}, "forest", { enumerable: true, get() { calls++; return true; } });
  assert.throws(() => normalizeHierarchyNodes([], options));
  assert.equal(calls, 0);
  assert.equal(normalizeHierarchyNodes([{ ...root(1)[0], sourceRows: undefined }], { forest: undefined }).totalValue, 1);
  for (const key of [null, undefined, [], {}, NaN, Infinity, new Date(NaN)]) {
    assert.throws(() => normalizeHierarchyNodes([{ key, parentKey: null, value: 1 }]));
    if (key !== null) assert.throws(() => normalizeHierarchyNodes([{ key: "x", parentKey: key, value: 1 }]));
  }
});

test("hierarchy rejects invalid options and source row references", () => {
  for (const options of [null, [], { valueMode: "invalid" }, { valueMode: null }, { forest: null }, { forest: 1 }, { maxNodes: null }, { maxNodes: 0 },
    { maxNodes: 1.5 }, { maxNodes: Infinity }, { maxNodes: Number.MAX_SAFE_INTEGER + 1 }, { extra: true }]) {
    assert.throws(() => normalizeHierarchyNodes([], options));
  }
  for (const sourceRows of [null, {}, [0, 0], [-1], [1.5], [Infinity], ["0"], Array(1)]) {
    assert.throws(() => normalizeHierarchyNodes([{ ...root(1)[0], sourceRows }]));
  }
  assert.deepEqual(normalizeHierarchyNodes([{ ...root(1)[0], sourceRows: [] }]).nodes[0].sourceRows, []);
});

test("hierarchy preflights node and cumulative work limits and counts synthetic roots", () => {
  assert.equal(normalizeHierarchyNodes(root(1), { maxNodes: 1 }).nodes.length, 1);
  assert.throws(() => normalizeHierarchyNodes(root(1), { forest: true, maxNodes: 1 }), /node count/);
  assert.equal(normalizeHierarchyNodes(root(1), { forest: true, maxNodes: 2 }).nodes.length, 2);
  assert.throws(() => normalizeHierarchyNodes(Array(208334), { maxNodes: 1_000_000 }), /work/);
  assert.throws(() => normalizeHierarchyNodes([{ key: "x".repeat(5_000_000), parentKey: null, value: 1 }]), /work/);
  assert.throws(() => normalizeHierarchyNodes([{ ...root(1)[0], sourceRows: Array(3_333_334) }]), /work/);
});

test("hierarchy normalization handles depth ten thousand iteratively with linear source membership", () => {
  const rows = Array.from({ length: 10_001 }, (_, key) => ({ key, parentKey: key === 0 ? null : key - 1,
    ...(key === 10_000 ? { value: 7 } : {}) }));
  const result = normalizeHierarchyNodes(rows, { maxNodes: 10_001 });
  assert.equal(result.nodes.length, 10_001);
  assert.equal(result.nodes.at(-1).depth, 10_000);
  assert.equal(result.totalValue, 7);
  assert.ok(result.nodes.every(node => node.totalValue === 7 && node.sourceRows.length === 1));
  assert.equal(rows[0].value, undefined);
});
