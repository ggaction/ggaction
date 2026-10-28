import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHierarchyNodes } from "../../../src/grammar/hierarchy/normalize.js";
import { indexHierarchyModel } from "../../../src/grammar/hierarchy/model.js";
import { orderHierarchyModel } from "../../../src/grammar/hierarchy/order.js";
import { layoutHierarchyTree } from "../../../src/grammar/hierarchy/tree.js";
import { layoutHierarchyPartition } from "../../../src/grammar/hierarchy/partition.js";
import { layoutHierarchyTreemap } from "../../../src/grammar/hierarchy/treemap.js";

const make = () => normalizeHierarchyNodes([
  { key: "r", parentKey: null, value: 99 }, { key: "c", parentKey: "r", value: 2 }
]);
const treeOptions = { nodeSize: [2, 2], siblingGap: 1, depthGap: 1, orientation: "vertical" };
const treemapOptions = { size: [90, 30], padding: 0, method: "slice-dice" };

function inheritedGetter(field, value, run) {
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, field);
  let reads = 0;
  Object.defineProperty(Object.prototype, field, {
    configurable: true, get() { reads++; return value; }
  });
  try { run(); } finally {
    if (previous) Object.defineProperty(Object.prototype, field, previous);
    else delete Object.prototype[field];
  }
  assert.equal(reads, 0, `Inherited ${field} must never be read`);
}

test("hierarchy model records reject missing own fields without consulting inherited accessors", () => {
  for (const [part, field, value] of [
    ["model", "valueMode", "leaf-sum"], ["node", "sourceRows", [0]],
    ["diagnostics", "emptyValue", false], ["ignored", "key", make().rootKey]
  ]) {
    const model = structuredClone(make());
    const record = part === "model" ? model : part === "node" ? model.nodes[0]
      : part === "diagnostics" ? model.diagnostics : model.diagnostics.ignoredInternalValues[0];
    delete record[field];
    const before = structuredClone(model);
    inheritedGetter(field, value, () => assert.throws(() => indexHierarchyModel(model), /own/));
    assert.deepEqual(model, before);
  }
  const model = structuredClone(make()); delete model.diagnostics.ignoredInternalValues[0].value;
  assert.throws(() => indexHierarchyModel(model), /own key and value/);
});

test("tree, treemap and sibling ordering require explicit own layout options", () => {
  const model = make();
  for (const [field, value, run] of [
    ["nodeSize", [2, 2], () => layoutHierarchyTree(model, { siblingGap: 1, depthGap: 1, orientation: "vertical" })],
    ["radius", 10, () => layoutHierarchyTree(model, { ...treeOptions, orientation: "radial", startAngle: 0, sweep: 360 })],
    ["size", [90, 30], () => layoutHierarchyTreemap(model, { padding: 0, method: "slice-dice" })],
    ["by", "input", () => orderHierarchyModel(model, {})],
    ["direction", "ascending", () => orderHierarchyModel(model, { by: "value" })]
  ]) inheritedGetter(field, value, () => assert.throws(run, /own|explicit/));
});

test("absent maxNodes and synthetic metadata ignore inherited accessors in every layout", () => {
  const model = make(), before = structuredClone(model);
  for (const field of ["maxNodes", "synthetic"]) inheritedGetter(field, true, () => {
    assert.equal(indexHierarchyModel(model).nodes.length, 2);
    const ordered = orderHierarchyModel(model, { by: "key", direction: "ascending" }, ["r", "c"]);
    assert.deepEqual(ordered.nodes.map(node => node.key), model.nodes.map(node => node.key));
    const tree = layoutHierarchyTree(model, treeOptions);
    assert.deepEqual(tree.nodes.map(({ x, y }) => [x, y]), [[0, 0], [0, 3]]);
    assert.ok(tree.nodes.every(node => !Object.hasOwn(node, "synthetic")));
    assert.deepEqual(layoutHierarchyPartition(model).nodes.map(({ u0, u1 }) => [u0, u1]), [[0, 1], [0, 1]]);
    for (const method of ["slice-dice", "squarify"]) {
      assert.deepEqual(layoutHierarchyTreemap(model, { ...treemapOptions, method }).nodes[1].rect,
        { x0: 0, y0: 0, x1: 90, y1: 30 });
    }
  });
  assert.deepEqual(model, before);
});

test("layout dimension arity and nested model capacities are checked before array inspection", () => {
  const model = make(), oversized = Array(10_000_000);
  let reads = 0;
  Object.defineProperty(oversized, "0", { enumerable: true, get() { reads++; return 1; } });
  assert.throws(() => layoutHierarchyTree(model, { ...treeOptions, nodeSize: oversized }), /breadth and depth/);
  assert.throws(() => layoutHierarchyTreemap(model, { ...treemapOptions, size: oversized }), /two finite/);
  for (const field of ["childrenKeys", "sourceRows"]) {
    const candidate = structuredClone(model); candidate.nodes[0][field] = oversized;
    assert.throws(() => indexHierarchyModel(candidate), /model work/);
    assert.equal(candidate.nodes[0][field], oversized);
  }
  assert.equal(reads, 0);
  assert.equal(oversized.length, 10_000_000);
});
