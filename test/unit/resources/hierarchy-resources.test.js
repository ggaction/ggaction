import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/ChartProgram.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { resolveHierarchyInput } from "../../../src/grammar/hierarchy/input.js";
import { validateResourceGraph } from "../../../src/materialization/resourceState.js";
import { hierarchySortValues } from "../../../src/materialization/hierarchy/resources.js";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";

const rows = [{ id: "root", parent: null, value: 10 }, { id: "b", parent: "root", value: 4 }, { id: "a", parent: "root", value: 6 }];
const treeOptions = { nodeSize: [20, 10], siblingGap: 10, depthGap: 20, orientation: "vertical" };
const base = () => chart().createData({ id: "rows", values: rows }).createHierarchyData({ id: "h", key: "id", parent: "parent", value: "value" });
const resource = (p, kind, id) => p.semanticSpec.resources.find(r => r.kind === kind && (id === undefined || r.id === id));

test("hierarchy and layout authoring resolve exact inputs and store one options owner", () => {
  const p = base().layoutHierarchy({ id: "tree", method: "tree", options: treeOptions })
    .layoutHierarchy({ id: "partition", method: "partition" })
    .layoutHierarchy({ id: "map", method: "treemap", options: { size: [200, 100], padding: 0, method: "slice-dice" } });
  const h = resource(p, "hierarchy");
  assert.equal(h.result.totalValue, 10);
  assert.deepEqual(h.result.nodes.map(n => n.sourceRows), [[0], [1], [2]]);
  assert.deepEqual(h.provenance.sourceRows.map(ref => ref.rowKey), p.semanticSpec.datasets[0].rowKeys);
  assert.deepEqual(resource(p, "layout", "tree").result.nodes.map(n => [n.x, n.y]), [[0, 0], [-15, 30], [15, 30]]);
  assert.deepEqual(resource(p, "layout", "partition").result.nodes.map(n => [n.u0, n.u1]), [[0, 1], [0, .4], [.4, 1]]);
  assert.deepEqual(resource(p, "layout", "map").result.nodes.map(n => n.area), [20000, 8000, 12000]);
  assert.ok(p.semanticSpec.resources.every(r => !Object.hasOwn(r.result, "options")));
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(p))), serializeProgram(p));
});

test("nested field order uses actual descendants and persistent member paths", () => {
  const nested = [{ id: "root", value: 10, rank: 3, kids: [{ id: "b", value: 4, rank: 2 }, { id: "a", value: 6, rank: 1 }] }];
  const p = chart().createData({ id: "nested", values: nested }).createHierarchyData({ id: "h", key: "id", children: "kids", value: "value" });
  const h = resource(p, "hierarchy"), resolved = resolveHierarchyInput(nested, h.options);
  assert.equal(resolved.sources.get(encodeRowKey("a")).object, nested[0].kids[1]);
  assert.deepEqual(resolved.sources.get(encodeRowKey("a")).member, { parent: { index: 0 }, field: "kids", index: 1 });
  assert.deepEqual(hierarchySortValues(p, h, { by: "field", field: "rank", direction: "ascending" }), [3, 2, 1]);
  const q = p.layoutHierarchy({ id: "l", method: "partition", order: { by: "field", field: "rank", direction: "ascending" } });
  assert.deepEqual(resource(q, "layout").result.nodes.map(n => n.key), ["root", "a", "b"].map(key => encodeRowKey(key)));
  assert.deepEqual(h.result.nodes.map(n => n.sourceRows), [[0], [0], [0]]);
});

test("grouped field sorting rejects ambiguous members and synthetic roots have no contribution", () => {
  const p = chart().createData({ id: "d", values: [{ group: "A", v: 2, rank: 1 }, { group: "A", v: 3, rank: 2 }] })
    .createHierarchyData({ id: "h", groupFields: ["group"], value: "v" });
  const h = resource(p, "hierarchy");
  assert.equal(h.result.nodes[0].synthetic, true);
  assert.deepEqual(h.result.nodes[0].sourceRows, []);
  assert.throws(() => p.layoutHierarchy({ id: "l", method: "partition", order: { by: "field", field: "rank", direction: "ascending" } }), /ambiguous/);
  assert.equal(p.semanticSpec.resources.length, 1);
});

test("hierarchy revision recomputes every dependent layout once and preserves unrelated results", () => {
  const p = base().layoutHierarchy({ id: "one", method: "partition" }).layoutHierarchy({ id: "two", method: "tree", options: treeOptions });
  const before = serializeProgram(p), q = p.editHierarchyData({ valueMode: "inclusive" });
  assert.deepEqual(q.semanticSpec.resources.map(r => r.revision), [1, 1, 1]);
  assert.equal(resource(q, "layout", "two").inputs[0].revision, 1);
  assert.equal(serializeProgram(p), before);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(q))), serializeProgram(q));
  assert.throws(() => p.editHierarchyData({ children: "kids" }), /form|Unsupported/);
  assert.throws(() => p.editHierarchyData({}), /nonempty/);
  assert.throws(() => p.editLayout({}), /nonempty/);
});

test("raw source revision updates hierarchy and layout closures atomically", () => {
  const p = base().layoutHierarchy({ id: "p", method: "partition" });
  const before = serializeProgram(p);
  const q = p.reviseData({ source: "rows", id: "next", values: [{ id: "root", parent: null, value: 10 }, { id: "a", parent: "root", value: 3 }] });
  assert.equal(resource(q, "hierarchy").inputs[0].id, "next");
  assert.equal(resource(q, "hierarchy").result.totalValue, 3);
  assert.equal(resource(q, "layout").result.nodes.length, 2);
  assert.equal(resource(q, "layout").revision, 1);
  assert.throws(() => p.reviseData({ source: "rows", id: "bad", values: [{ id: "orphan", parent: "absent", value: 2 }] }), /parent/i);
  assert.equal(serializeProgram(p), before);
});

test("computed data revision reaches hierarchy before old derived data is released", () => {
  const p = chart().createData({ id: "d", values: rows }).createParameter({ id: "factor", value: 1 })
    .createComputedData({ id: "computed", source: "d", as: "scaled", expression: { version: 2, registry: "standard@1", root: { type: "binary", op: "multiply", left: { type: "field", name: "value" }, right: { type: "parameter", id: "factor" } } } })
    .createHierarchyData({ id: "h", data: "computed", key: "id", parent: "parent", value: "scaled" })
    .layoutHierarchy({ id: "l", method: "partition" });
  const q = p.editParameter({ target: "factor", value: 2 });
  assert.equal(resource(q, "hierarchy").result.totalValue, 20);
  assert.equal(resource(q, "layout").revision, 1);
  assert.notEqual(resource(q, "hierarchy").inputs[0].id, "computed");
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(q))), serializeProgram(q));
});

test("resource inference uses current kinds and never chooses the first ambiguous candidate", () => {
  const p = base().createHierarchyData({ id: "other", key: "id", parent: "parent", value: "value" });
  assert.equal(p.layoutHierarchy({ id: "l", method: "partition" }).semanticSpec.resources.at(-1).inputs[0].id, "other");
  const noContext = p._clone({ context: {} });
  assert.throws(() => noContext.layoutHierarchy({ id: "l", method: "partition" }), /explicit/);
  assert.throws(() => p.createHierarchyData({ id: "h", key: "id", parent: "parent", value: "value" }), /exists/);
  assert.throws(() => p.createHierarchyData({ id: "x", key: "id", parent: "parent", children: "kids", value: "value" }), /exactly/);
});

test("generic stored resource removal restricts shared dependents", () => {
  const p = base().layoutHierarchy({ id: "l", method: "partition" });
  for (const cascade of [false, true]) assert.throws(() => p.removeResource({ kind: "hierarchy", id: "h", cascade }), /dependent/);
  const q = p.removeResource({ kind: "layout", id: "l" }).removeResource({ kind: "hierarchy", id: "h" });
  assert.deepEqual(q.semanticSpec.resources, []);
  assert.equal(p.semanticSpec.resources.length, 2);
  assert.throws(() => p.removeResource({ kind: "data", id: "rows" }), /kind/);
  assert.throws(() => p.removeResource({ kind: "hierarchy", id: "h", cascade: 1 }), /boolean/);
});

test("stored hierarchy and layout validation rejects malformed topology, bounds and refs", () => {
  const p = base().layoutHierarchy({ id: "l", method: "partition" });
  const variants = [
    r => { r[0].result.nodes[1].sourceRows = [99]; },
    r => { r[0].result.nodes[0].sourceRows = []; r[0].result.nodes[0].synthetic = true; },
    r => { r[1].inputs[0].revision++; },
    r => { r[1].result.nodes[1].u1 = 2; },
    r => { r[1].result.nodes[1].key = "unknown"; },
    r => { r[1].result.options = {}; }
  ];
  for (const change of variants) {
    const resources = structuredClone(p.semanticSpec.resources); change(resources);
    assert.throws(() => validateResourceGraph({ ...p, semanticSpec: { ...p.semanticSpec, resources } }, p.constructor));
  }
});

test("Full hierarchy capability does not add methods or primitive support to Basic", () => {
  const p = base(), basic = basicChart();
  assert.equal(typeof basic.createHierarchyData, "undefined");
  assert.equal(typeof basic.layoutHierarchy, "undefined");
  assert.throws(() => basic.editSemantic({ property: "resource[hierarchy:h]", value: resource(p, "hierarchy") }), /not registered/);
});
