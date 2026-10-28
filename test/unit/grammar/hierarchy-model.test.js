import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHierarchyNodes } from "../../../src/grammar/hierarchy/normalize.js";
import { indexHierarchyModel } from "../../../src/grammar/hierarchy/model.js";
import { orderHierarchyModel } from "../../../src/grammar/hierarchy/order.js";
import { layoutHierarchyTree } from "../../../src/grammar/hierarchy/tree.js";
import { layoutHierarchyPartition } from "../../../src/grammar/hierarchy/partition.js";
import { layoutHierarchyTreemap } from "../../../src/grammar/hierarchy/treemap.js";
import { hierarchyRows } from "../../oracles/hierarchy.js";

const make = () => normalizeHierarchyNodes(hierarchyRows);

test("shared hierarchy model indexing accepts canonical modes, empty values and synthetic forests", () => {
  for (const valueMode of ["leaf-sum", "inclusive", "own-plus-children"]) {
    for (const rows of [hierarchyRows, [], [{ key: "r", parentKey: null, value: 0 }]]) {
      const model = normalizeHierarchyNodes(rows, { valueMode }), before = JSON.stringify(model);
      const { nodes, indexes, work } = indexHierarchyModel(model);
      assert.equal(nodes, model.nodes);
      assert.equal(indexes.size, nodes.length);
      assert.ok(Number.isSafeInteger(work) && work >= 0);
      nodes.forEach((node, index) => assert.equal(indexes.get(node.key), index));
      assert.equal(JSON.stringify(model), before);
    }
  }
  const forest = normalizeHierarchyNodes([{ key: "a", parentKey: null, value: 1 }, { key: "b", parentKey: null, value: 2 }], { forest: true });
  assert.equal(indexHierarchyModel(forest).nodes.length, 3);
});

test("inclusive validation preserves subtraction-rounded residuals across ordering and layouts", () => {
  for (const [total, child, residual] of [[0.9, 0.2, 0.7], [9e307, 2e307, 7e307], [9e-307, 2e-307, 7e-307]]) {
    const rows = [{ key: "r", parentKey: null, value: total }, { key: "c", parentKey: "r", value: child }];
    const before = structuredClone(rows);
    const model = normalizeHierarchyNodes(rows, { valueMode: "inclusive" });
    assert.equal(model.nodes[0].residual, residual);
    assert.equal(model.totalValue, total);
    assert.equal(indexHierarchyModel(model).nodes.length, 2);
    const ordered = orderHierarchyModel(model, { by: "value", direction: "ascending" });
    const tree = layoutHierarchyTree(ordered, { nodeSize: [2, 2], siblingGap: 1, depthGap: 1, orientation: "vertical" });
    assert.deepEqual(tree.nodes.map(({ x, y }) => [x, y]), [[0, 0], [0, 3]]);
    const partition = layoutHierarchyPartition(ordered);
    assert.equal(partition.nodes[0].u1, 1);
    assert.ok(Math.abs(partition.nodes[1].u1 - 2 / 9) < 1e-16);
    for (const method of ["slice-dice", "squarify"]) {
      const treemap = layoutHierarchyTreemap(ordered, { size: [90, 30], padding: 0, method });
      const rect = treemap.nodes[1].rect;
      assert.ok(Math.abs((rect.x1 - rect.x0) * (rect.y1 - rect.y0) - 600) < 1e-12);
      assert.equal(treemap.nodes[0].totalValue, total);
    }
    assert.deepEqual(rows, before);
    assert.deepEqual(model, ordered);
  }
  assert.notEqual(0.7 + 0.2, 0.9);
});

test("inclusive model validation still rejects altered residuals and excessive child totals exactly", () => {
  const model = normalizeHierarchyNodes([{ key: "r", parentKey: null, value: 0.9 },
    { key: "c", parentKey: "r", value: 0.2 }], { valueMode: "inclusive" });
  for (const mutate of [
    candidate => { candidate.nodes[0].ownValue = candidate.nodes[0].residual = 0.7000000000000001; },
    candidate => { candidate.nodes[0].totalValue = candidate.totalValue = 0.1; }
  ]) {
    const candidate = structuredClone(model); mutate(candidate);
    const before = structuredClone(candidate);
    assert.throws(() => indexHierarchyModel(candidate), /child values/);
    assert.deepEqual(candidate, before);
  }
});

test("hierarchy model rejects forged keys, values, source references and root metadata", () => {
  const changes = [
    m => { m.extra = true; }, m => { m.valueMode = "other"; }, m => { m.nodes = null; },
    m => { m.nodes[0] = null; }, m => { m.nodes[0].extra = true; },
    m => { m.nodes[0].key = ""; }, m => { m.nodes[0].key = null; }, m => { m.nodes[1].key = m.nodes[0].key; },
    m => { m.nodes[1].parentKey = 3; }, m => { m.nodes[1].parentKey = ""; },
    m => { m.nodes[1].depth = -1; }, m => { m.nodes[1].depth = 0.5; },
    m => { m.nodes[0].ownValue = NaN; }, m => { m.nodes[0].totalValue = Infinity; },
    m => { m.nodes[0].residual = -1; }, m => { m.nodes[0].ownValue = 1; },
    m => { m.nodes[0].childrenKeys = null; }, m => { m.nodes[0].sourceRows = null; },
    m => { m.nodes[0].sourceRows = [0, 0]; }, m => { m.nodes[0].sourceRows = [-1]; },
    m => { m.nodes[0].synthetic = false; }, m => { m.nodes[0].synthetic = true; },
    m => { m.nodes[1].synthetic = true; }, m => { m.rootKey = "missing"; },
    m => { m.nodes[0].parentKey = "missing"; }, m => { m.nodes[0].depth = 1; }, m => { m.totalValue = 11; }
  ];
  for (const change of changes) {
    const model = structuredClone(make()); change(model);
    const before = structuredClone(model);
    assert.throws(() => indexHierarchyModel(model));
    assert.deepEqual(model, before);
  }
  const empty = structuredClone(normalizeHierarchyNodes([])); empty.totalValue = 1;
  assert.throws(() => indexHierarchyModel(empty), /Empty/);
  empty.totalValue = 0; empty.rootKey = "missing";
  assert.throws(() => indexHierarchyModel(empty), /Empty/);
});

test("hierarchy model rejects inconsistent child topology and value totals", () => {
  for (const change of [
    m => { m.nodes[0].childrenKeys[0] = 1; },
    m => { m.nodes[0].childrenKeys[0] = "absent"; },
    m => { m.nodes[0].childrenKeys[1] = m.nodes[0].childrenKeys[0]; },
    m => { m.nodes[1].parentKey = "absent"; },
    m => { m.nodes[1].depth = 9; },
    m => { m.nodes[0].childrenKeys.reverse(); },
    m => { m.nodes.push({ key: "other", parentKey: null, childrenKeys: [], depth: 0, ownValue: 0, totalValue: 0, residual: 0, sourceRows: [] }); },
    m => { m.nodes[2].totalValue = 1; },
    m => { m.nodes[2].totalValue = Number.MAX_VALUE; m.nodes[3].totalValue = Number.MAX_VALUE; },
    m => { m.nodes[0].ownValue = m.nodes[0].residual = 1; m.nodes[0].totalValue = m.totalValue = 11; }
  ]) {
    const model = structuredClone(make()); change(model);
    assert.throws(() => indexHierarchyModel(model));
  }
});

test("hierarchy model diagnostics remain consistent with empty and ignored internal values", () => {
  const forest = structuredClone(normalizeHierarchyNodes([{ key: "a", parentKey: null, value: 1 }], { forest: true }));
  forest.diagnostics.ignoredInternalValues.push({ key: forest.rootKey, value: 1 });
  assert.throws(() => indexHierarchyModel(forest), /ignored internal value/);
  for (const change of [
    m => { m.diagnostics = null; }, m => { m.diagnostics.extra = true; },
    m => { m.diagnostics.emptyHierarchy = true; }, m => { m.diagnostics.emptyValue = true; },
    m => { m.diagnostics.ignoredInternalValues = null; },
    m => { m.diagnostics.ignoredInternalValues[0] = null; },
    m => { m.diagnostics.ignoredInternalValues[0].extra = true; },
    m => { m.diagnostics.ignoredInternalValues[0].key = "missing"; },
    m => { m.diagnostics.ignoredInternalValues[0].key = m.nodes[2].key; },
    m => { m.diagnostics.ignoredInternalValues.push(m.diagnostics.ignoredInternalValues[0]); },
    m => { m.diagnostics.ignoredInternalValues[0].value = -1; },
    m => { m.diagnostics.ignoredInternalValues[0].value = NaN; },
    m => { m.valueMode = "inclusive"; }
  ]) {
    const model = structuredClone(make()); change(model);
    assert.throws(() => indexHierarchyModel(model));
  }
});

test("hierarchy model capacity and accessors fail before layout allocation", () => {
  for (const maxNodes of [null, 0, -1, 1.5, Infinity]) assert.throws(() => indexHierarchyModel(make(), maxNodes), /maxNodes/);
  assert.throws(() => indexHierarchyModel(make(), 4), /node count/);
  const model = structuredClone(make()); model.nodes = Array(208334);
  assert.throws(() => indexHierarchyModel(model, 300000), /work/);
  let calls = 0;
  const getter = Object.defineProperty({}, "nodes", { enumerable: true, get() { calls++; return []; } });
  assert.throws(() => indexHierarchyModel(getter));
  assert.equal(calls, 0);
});
