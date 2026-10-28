import assert from "node:assert/strict";
import test from "node:test";
import { stableFiniteSum, stableFinitePrefixSums } from "../../../src/grammar/numeric.js";
import { normalizeHierarchyNodes } from "../../../src/grammar/hierarchy/normalize.js";
import { normalizeHierarchyInput } from "../../../src/grammar/hierarchy/input.js";
import { layoutHierarchyPartition } from "../../../src/grammar/hierarchy/partition.js";
import { hierarchyRows } from "../../oracles/hierarchy.js";
import { integerHierarchyPartition } from "../../oracles/hierarchy-partition.js";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 2e-15, `${actual} != ${expected}`);
const projection = nodes => nodes.map(({ key, u0, u1, residualStart }) => ({ key, u0, u1, residualStart }));

test("partition has literal intervals with exact closing edges and unchanged source identity", () => {
  const model = normalizeHierarchyNodes(hierarchyRows), result = layoutHierarchyPartition(model);
  const expected = [[0, 1], [0, 0.6], [0, 0.2], [0.2, 0.6], [0.6, 1]];
  result.nodes.forEach((node, index) => {
    close(node.u0, expected[index][0]); close(node.u1, expected[index][1]);
    for (const field of ["key", "parentKey", "depth", "totalValue", "ownValue", "residual", "sourceRows"]) assert.deepEqual(node[field], model.nodes[index][field]);
  });
  assert.equal(result.nodes[3].u1, result.nodes[1].u1);
  assert.equal(result.nodes[4].u1, 1);
  close((result.nodes[1].u1 - result.nodes[1].u0) * 1000, 600);
});

test("inclusive and own-plus-children preserve residual as a reserved tail without inventing nodes", () => {
  for (const valueMode of ["inclusive", "own-plus-children"]) {
    const rows = [{ key: "r", parentKey: null, value: valueMode === "inclusive" ? 10 : 4 },
      { key: "a", parentKey: "r", value: 2 }, { key: "b", parentKey: "r", value: 4 }];
    const result = layoutHierarchyPartition(normalizeHierarchyNodes(rows, { valueMode }));
    assert.deepEqual(result.nodes.map(node => [node.u0, node.u1, node.residualStart]), [[0, 1, 0.6], [0, 0.2, 0], [0.2, 0.6, 0.2]]);
    assert.equal(result.nodes.length, 3);
    assert.equal(result.nodes[0].residual, 4);
  }
});

test("partition matches an independent exact integer-weight oracle and conserves every parent interval", () => {
  let seed = 19;
  for (let trial = 0; trial < 40; trial++) {
    const rows = Array.from({ length: 30 }, (_, key) => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return { key, parentKey: key === 0 ? null : seed % key, value: seed % 13 };
    });
    const model = normalizeHierarchyNodes(rows, { valueMode: "own-plus-children" });
    const result = layoutHierarchyPartition(model), expected = integerHierarchyPartition(model);
    const byKey = new Map(result.nodes.map(node => [node.key, node]));
    projection(result.nodes).forEach((node, index) => {
      assert.equal(node.key, expected[index].key);
      for (const field of ["u0", "u1", "residualStart"]) close(node[field], expected[index][field]);
      const original = result.nodes[index], children = original.childrenKeys.map(key => byKey.get(key));
      assert.ok(node.u0 <= node.residualStart && node.residualStart <= node.u1);
      children.forEach((child, i) => {
        assert.ok(child.u0 >= node.u0 && child.u1 <= node.u1 && child.u0 <= child.u1);
        assert.equal(child.u0, i === 0 ? node.u0 : children[i - 1].u1);
      });
      close(children.reduce((sum, child) => sum + child.u1 - child.u0, 0) + node.u1 - node.residualStart, node.u1 - node.u0);
    });
  }
});

test("zero weights, empty input, singleton and synthetic forests preserve zero-width metadata", () => {
  const empty = layoutHierarchyPartition(normalizeHierarchyNodes([]));
  assert.deepEqual(empty.nodes, []); assert.equal(empty.rootKey, null);
  for (const forest of [false, true]) {
    const model = normalizeHierarchyNodes([{ key: "r", parentKey: null, value: 0 }, { key: "a", parentKey: "r", value: 0 }], { forest });
    const result = layoutHierarchyPartition(model);
    assert.ok(result.nodes.every(node => node.u0 === 0 && node.u1 === 0 && node.residualStart === 0));
    assert.equal(result.diagnostics.emptyValue, true);
  }
  assert.deepEqual(layoutHierarchyPartition(normalizeHierarchyNodes([{ key: "r", parentKey: null, value: 2 }])).nodes.map(node => [node.u0, node.u1, node.residualStart]), [[0, 1, 0]]);
  const result = layoutHierarchyPartition(normalizeHierarchyNodes([{ key: 0, parentKey: null, value: 0 }, { key: 1, parentKey: null, value: 2 }], { forest: true }));
  assert.equal(result.nodes[0].synthetic, true);
  assert.deepEqual(result.nodes.map(node => [node.u0, node.u1]), [[0, 1], [0, 0], [0, 1]]);
});

test("explicit compensated hierarchy arithmetic preserves small weights without changing existing numeric defaults", () => {
  const values = [1e16, 1, 1];
  assert.equal(stableFiniteSum(values), 1e16);
  assert.deepEqual(stableFinitePrefixSums(values), [1e16, 1e16, 1e16]);
  assert.equal(stableFiniteSum(values, "sum", { compensated: true }), 10000000000000002);
  assert.deepEqual(stableFinitePrefixSums(values, "sum", { compensated: true }), [1e16, 1e16, 10000000000000002]);
  const rows = [{ key: "r", parentKey: null }, ...values.map((value, key) => ({ key, parentKey: "r", value }))];
  const model = normalizeHierarchyNodes(rows), result = layoutHierarchyPartition(model);
  assert.equal(model.totalValue, 10000000000000002);
  assert.equal(result.nodes.at(-1).u1, 1);
  assert.ok(result.nodes[1].u1 < 1);
  const groups = normalizeHierarchyInput(values.map(value => ({ group: "a", value })), { format: "groups", groupFields: ["group"], value: "value" });
  assert.equal(groups.totalValue, model.totalValue);
  assert.throws(() => stableFiniteSum([Number.MAX_VALUE, Number.MAX_VALUE], "sum", { compensated: true }), /finite/);
});

test("partition rejects invalid options and models with cumulative bounds while preserving callers", () => {
  const model = normalizeHierarchyNodes(hierarchyRows), before = JSON.stringify(model), result = layoutHierarchyPartition(model);
  assert.ok(Object.isFrozen(result.nodes[0]) && Object.isFrozen(result.nodes[0].sourceRows));
  assert.equal(JSON.stringify(model), before);
  for (const options of [null, { padding: 1 }, { orientation: "vertical" }, { maxNodes: 2 }, { maxNodes: 0 }]) {
    assert.throws(() => layoutHierarchyPartition(model, options));
  }
  assert.throws(() => layoutHierarchyPartition(null));
  const large = structuredClone(normalizeHierarchyNodes([{ key: "r", parentKey: null, value: 1 }]));
  large.rootKey = large.nodes[0].key = "k".repeat(9_999_920);
  assert.throws(() => layoutHierarchyPartition(large), /partition work/);
});

test("partition remains iterative for a ten-thousand-level hierarchy", () => {
  const rows = Array.from({ length: 10_001 }, (_, key) => ({ key, parentKey: key === 0 ? null : key - 1, value: 1 }));
  const result = layoutHierarchyPartition(normalizeHierarchyNodes(rows, { maxNodes: 10_001 }), { maxNodes: 10_001 });
  assert.equal(result.nodes.length, 10_001);
  assert.ok(result.nodes.every(node => node.u0 === 0 && node.u1 === 1));
});
