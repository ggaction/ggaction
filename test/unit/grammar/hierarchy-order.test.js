import assert from "node:assert/strict";
import test from "node:test";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";
import { normalizeHierarchyNodes } from "../../../src/grammar/hierarchy/normalize.js";
import { indexHierarchyModel } from "../../../src/grammar/hierarchy/model.js";
import { orderHierarchyModel } from "../../../src/grammar/hierarchy/order.js";
import { layoutHierarchyTree } from "../../../src/grammar/hierarchy/tree.js";
import { layoutHierarchyPartition } from "../../../src/grammar/hierarchy/partition.js";
import { layoutHierarchyTreemap } from "../../../src/grammar/hierarchy/treemap.js";

const rows = [{ key: "r", parentKey: null }, { key: "b", parentKey: "r", value: 3 },
  { key: "a", parentKey: "r", value: 1 }, { key: "c", parentKey: "r", value: 3 }];
const make = () => normalizeHierarchyNodes(rows);
const keys = names => names.map(value => encodeRowKey(value));

test("input ordering preserves canonical model while value ordering is stable and rebuilds preorder", () => {
  const model = make(), before = JSON.stringify(model);
  assert.deepEqual(orderHierarchyModel(model, { by: "input" }), model);
  assert.deepEqual(orderHierarchyModel(model, { by: "value", direction: "ascending" }).nodes.map(node => node.key), keys(["r", "a", "b", "c"]));
  assert.deepEqual(orderHierarchyModel(model, { by: "value", direction: "descending" }).nodes.map(node => node.key), keys(["r", "b", "c", "a"]));
  const result = orderHierarchyModel(model, { by: "value", direction: "ascending" });
  assert.equal(indexHierarchyModel(result).nodes.length, 4);
  const byKey = new Map(model.nodes.map(node => [node.key, node]));
  result.nodes.forEach(node => {
    for (const field of ["parentKey", "depth", "ownValue", "totalValue", "residual", "sourceRows"]) assert.deepEqual(node[field], byKey.get(node.key)[field]);
  });
  assert.equal(JSON.stringify(model), before);
  assert.ok(Object.isFrozen(result.nodes[0].childrenKeys) && Object.isFrozen(result.nodes[1].sourceRows));
});

test("key sorting reuses typed scalar identity order and checks supplied values without decoding tokens", () => {
  const authored = ["r", "z", 2n, new Date(0), true, 2, false, 1n, 1, "a"];
  const model = normalizeHierarchyNodes(authored.map((key, index) => ({ key, parentKey: index === 0 ? null : "r", value: 1 })));
  const result = orderHierarchyModel(model, { by: "key", direction: "ascending" }, authored);
  assert.deepEqual(result.nodes.map(node => node.key), keys(["r", false, true, 1, 2, 1n, 2n, "a", "z", new Date(0)]));
  const reversed = orderHierarchyModel(model, { by: "key", direction: "descending" }, authored);
  assert.deepEqual(reversed.nodes.slice(1).map(node => node.key), result.nodes.slice(1).map(node => node.key).reverse());
  assert.equal(authored[3].getTime(), 0);
  const forest = normalizeHierarchyNodes([{ key: "z", parentKey: null, value: 1 }, { key: "a", parentKey: null, value: 1 }], { forest: true });
  const sorted = orderHierarchyModel(forest, { by: "key", direction: "ascending" }, [undefined, "z", "a"]);
  assert.equal(sorted.nodes[0].synthetic, true);
  assert.deepEqual(sorted.nodes.slice(1).map(node => node.key), keys(["a", "z"]));
});

test("field sorting shares scalar, null, type and temporal policies with sorted data", () => {
  const model = make();
  assert.deepEqual(orderHierarchyModel(model, { by: "field", direction: "ascending" }, [undefined, 3, null, 1]).nodes.map(node => node.key), keys(["r", "c", "b", "a"]));
  assert.deepEqual(orderHierarchyModel(model, { by: "field", direction: "descending", nulls: "first" }, [undefined, 3, null, 1]).nodes.map(node => node.key), keys(["r", "a", "b", "c"]));
  assert.deepEqual(orderHierarchyModel(model, { by: "field", direction: "ascending" }, [undefined, "z", "a", "z"]).nodes.map(node => node.key), keys(["r", "a", "b", "c"]));
  assert.deepEqual(orderHierarchyModel(model, { by: "field", direction: "ascending", temporalUnit: "timestamp" }, [null, 3000, 1000, 2000]).nodes.map(node => node.key), keys(["r", "a", "c", "b"]));
  assert.deepEqual(orderHierarchyModel(model, { by: "field", direction: "ascending", temporalUnit: "year" }, [null, "2024", "2022", "2023"]).nodes.map(node => node.key), keys(["r", "a", "c", "b"]));
  assert.throws(() => orderHierarchyModel(model, { by: "field", direction: "ascending", temporalUnit: "timestamp" }, [null, "2024-03-01", "2024-01-01", "2024-02-01"]));
  for (const values of [[null, 1, "1", 2], [null, 1, Infinity, 2], [null, 1, {}, 2]]) assert.throws(() => orderHierarchyModel(model, { by: "field", direction: "ascending" }, values));
  for (const patch of [{ nulls: "middle" }, { temporalUnit: "week" }]) assert.throws(() => orderHierarchyModel(model, { by: "field", direction: "ascending", ...patch }, [null, 1, 2, 3]));
});

test("one ordered model supplies tree, partition and slice-dice without changing logical values or lineage", () => {
  const model = normalizeHierarchyNodes([{ key: "r", parentKey: null }, { key: "b", parentKey: "r" },
    { key: "a", parentKey: "r", value: 3 }, { key: "d", parentKey: "b", value: 1 }, { key: "c", parentKey: "b", value: 1 }]);
  const ordered = orderHierarchyModel(model, { by: "key", direction: "ascending" }, ["r", "b", "d", "c", "a"]);
  assert.deepEqual(ordered.nodes.map(node => node.key), keys(["r", "a", "b", "c", "d"]));
  indexHierarchyModel(ordered);
  const tree = layoutHierarchyTree(ordered, { nodeSize: [2, 2], siblingGap: 1, depthGap: 1, orientation: "vertical" });
  const partition = layoutHierarchyPartition(ordered), treemap = layoutHierarchyTreemap(ordered, { size: [100, 60], padding: 0, method: "slice-dice" });
  assert.ok(tree.nodes[1].x < tree.nodes[2].x);
  assert.equal(partition.nodes[1].u0, 0); assert.equal(partition.nodes[1].u1, 0.6);
  assert.equal(treemap.nodes[1].rect.x0, 0); assert.equal(treemap.nodes[1].rect.x1, 60);
  assert.equal(ordered.totalValue, model.totalValue);
  assert.deepEqual(ordered.nodes.find(node => node.key === encodeRowKey("c")).sourceRows, [4]);
});

test("hierarchy order handles empty and deep inputs without recursive traversal", () => {
  for (const by of ["input", "value", "key", "field"]) {
    const options = by === "input" ? { by } : { by, direction: "ascending" };
    assert.deepEqual(orderHierarchyModel(normalizeHierarchyNodes([]), options, ["key", "field"].includes(by) ? [] : undefined).nodes, []);
  }
  const chain = Array.from({ length: 10_001 }, (_, key) => ({ key, parentKey: key === 0 ? null : key - 1, value: 1 }));
  const model = normalizeHierarchyNodes(chain, { maxNodes: 10_001 });
  const result = orderHierarchyModel(model, { by: "value", direction: "ascending", maxNodes: 10_001 });
  assert.equal(result.nodes.length, 10_001); assert.equal(result.nodes.at(-1).depth, 10_000);
});

test("hierarchy ordering rejects ambiguous values, wrong key bindings and capacity violations atomically", () => {
  const model = make(), before = JSON.stringify(model);
  for (const options of [null, { by: "auto" }, { by: "value" }, { by: "value", direction: "sideways" }, { by: "input", direction: "ascending" }, { by: "input", maxNodes: 2 }]) assert.throws(() => orderHierarchyModel(model, options));
  assert.throws(() => orderHierarchyModel(null, { by: "input" }));
  assert.throws(() => orderHierarchyModel(model, { by: "input" }, []));
  for (const values of [undefined, null, [], ["r", "b", "c", "a"], ["r", "b", [], "c"]]) assert.throws(() => orderHierarchyModel(model, { by: "key", direction: "ascending" }, values));
  let calls = 0;
  const accessors = ["r", "b", "a", "c"];
  Object.defineProperty(accessors, "1", { get() { calls++; return "b"; } });
  assert.throws(() => orderHierarchyModel(model, { by: "key", direction: "ascending" }, accessors));
  assert.equal(calls, 0);
  assert.throws(() => orderHierarchyModel(model, { by: "field", direction: "ascending" }, [null, "x".repeat(2_000_000), "a", "b"]), /ordering work/);
  assert.equal(JSON.stringify(model), before);
});
