import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { validateResourceGraph } from "../../../src/materialization/resourceState.js";

const rows = [{ id: "root", parent: null, value: 10, rank: null }, { id: "a", parent: "root", value: 6, rank: 2024 }, { id: "b", parent: "root", value: 4, rank: 2023 }];
const treeOptions = { nodeSize: [20, 10], siblingGap: 10, depthGap: 20, orientation: "vertical" };
const data = () => chart().createCanvas({ width: 300, height: 200 }).createData({ id: "d", values: rows });
const base = () => data().createHierarchyData({ id: "h", key: "id", parent: "parent", value: "value" });
const tree = () => base().layoutHierarchy({ id: "l", method: "tree", options: treeOptions }).createTreePlot({ id: "plot" });
function invalidState(program, changes, pattern) {
  const semanticSpec = structuredClone(program.semanticSpec), materializationConfigs = structuredClone(program.materializationConfigs);
  changes(semanticSpec, materializationConfigs);
  assert.throws(() => validateResourceGraph({ ...program, semanticSpec, materializationConfigs }, program.constructor), pattern);
}

test("hierarchy authoring rejects malformed source, ordering and layout policies atomically", () => {
  const p = data(), old = serializeProgram(p);
  const source = { id: "h", key: "id", parent: "parent", value: "value" };
  for (const patch of [{ parent: undefined }, { maxNodes: 0 }, { valueMode: "sum" }, { forest: 1 }, { children: "kids" }, { unknown: true }]) {
    assert.throws(() => p.createHierarchyData({ ...source, ...patch }));
  }
  const q = base(), before = serializeProgram(q);
  for (const order of [null, { by: "other", direction: "ascending" }, { by: "key" }, { by: "key", direction: "ascending", nulls: "first" },
    { by: "field", field: "", direction: "ascending" }, { by: "field", field: "rank", direction: "ascending", nulls: "middle" },
    { by: "field", field: "rank", direction: "ascending", temporalUnit: "month" }, { by: "field", field: "rank", direction: "ascending", nulls: undefined }]) {
    assert.throws(() => q.layoutHierarchy({ id: "l", method: "partition", order }));
  }
  for (const options of [{ maxNodes: 0 }, { maxNodes: 1.5 }, { maxNodes: undefined }, { unexpected: true }]) {
    assert.throws(() => q.layoutHierarchy({ id: "l", method: "partition", options }));
  }
  assert.throws(() => q.layoutHierarchy({ id: "l", method: "other" }), /method/);
  const ordered = q.layoutHierarchy({ id: "l", method: "partition", order: { by: "field", field: "rank", direction: "descending", nulls: "last", temporalUnit: "year" } });
  assert.equal(ordered.semanticSpec.resources.at(-1).options.order.temporalUnit, "year");
  assert.equal(serializeProgram(p), old); assert.equal(serializeProgram(q), before);
});

test("grouped overrides preserve typed path identity and enforce missing-category policy", () => {
  const source = chart().createCanvas({ width: 200, height: 200 }).createData({ id: "d", values: [{ group: null, v: 1 }, { group: 1, v: 2 }, { group: "1", v: 3 }] });
  const p = source.createHierarchyData({ id: "h", groupFields: ["group"], value: "v", missingCategory: "include" })
    .layoutHierarchy({ id: "l", method: "treemap", options: { size: [150, 150], padding: 2, method: "slice-dice" } })
    .createTreemapPlot({ id: "p", cells: { overrides: [{ path: [null], fill: "red" }, { path: [1], fill: "blue" }, { path: ["1"], fill: "green" }] },
      labels: { overrides: [{ path: [null], text: "Missing" }] } });
  assert.equal(new Set(p.markConfigs.p.hierarchyPlot.cells.overrides.map(entry => entry.key)).size, 3);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(p))), serializeProgram(p));
  for (const target of [{ key: 1 }, { path: [] }, { path: [1, 2] }, { path: [[1]] }, { key: 1, path: [1] }]) {
    assert.throws(() => p.editTreemapPlot({ cells: { overrides: [{ ...target, fill: "red" }] } }));
  }
  const q = chart().createCanvas({ width: 200, height: 200 }).createData({ id: "d", values: [{ group: 1, v: 1 }] })
    .createHierarchyData({ id: "h", groupFields: ["group"], value: "v" }).layoutHierarchy({ id: "l", method: "tree", options: treeOptions });
  assert.throws(() => q.createTreePlot({ nodes: { overrides: [{ path: [null], fill: "red" }] } }), /missingCategory/);
});

test("plot styles reject malformed values while explicit empty edits preserve stored meaning", () => {
  const p = tree(), before = serializeProgram(p);
  for (const options of [{ origin: [0] }, { origin: [0, Infinity] }, { clip: "yes" }, { labels: { content: "key" } },
    { nodes: { radius: -1 } }, { links: { fill: "red" } }, { labels: { fontSize: 0 } }, { labels: { fontWeight: {} } },
    { nodes: { overrides: [{ key: "a", text: "Label" }] } }, { labels: { overrides: [{ key: "a", text: 3 }] } },
    { nodes: { overrides: [{ key: "a" }, { key: "a" }] } }, { nodes: { overrides: [{ key: "absent" }] } }]) assert.throws(() => p.editTreePlot(options));
  const q = p.editTreePlot({ links: false, labels: { overrides: [{ key: "a", text: "A", fontWeight: 600 }] } })
    .editTreePlot({ links: {}, labels: {} }).editTreePlot({ nodes: {} });
  assert.equal(q.semanticSpec.layers[0].hierarchyLabels.overrides[0].text, "A");
  assert.equal(q.markConfigs.plot.hierarchyPlot.links.stroke, "#94a3b8");
  assert.equal(serializeProgram(p), before);
});

test("restored hierarchy plots reject malformed stored style and meaning independently", () => {
  const p = tree().editTreePlot({ labels: { overrides: [{ key: "a", text: "A" }] }, nodes: { overrides: [{ key: "a", fill: "red" }] } });
  const changes = [
    (s, c) => { delete c.marks.plot.hierarchyPlot.nodes.radius; },
    (s, c) => { c.marks.plot.hierarchyPlot.clip = 1; },
    (s, c) => { c.marks.plot.hierarchyPlot.nodes.overrides.push(c.marks.plot.hierarchyPlot.nodes.overrides[0]); },
    (s, c) => { c.marks.plot.hierarchyPlot.origin = [NaN, 0]; },
    s => { s.layers[0].hierarchyLabels = false; },
    s => { s.layers[0].hierarchyLabels.content = "key"; },
    s => { s.layers[0].hierarchyLabels.overrides.push(s.layers[0].hierarchyLabels.overrides[0]); },
    s => { s.layers[0].hierarchyLabels.overrides[0].text = 4; },
    s => { s.layers[0].mark.type = "treemap"; },
    s => { s.layers[0].encoding = {}; }
  ];
  for (const change of changes) invalidState(p, change);
});

test("stored tree geometry stays tied to exact depth and polar coordinates", () => {
  const p = tree();
  for (const change of [
    s => { s.resources[1].result.nodes[1].y++; },
    s => { s.resources[1].result.nodes[1].key = s.resources[1].result.nodes[0].key; },
    s => { s.resources[1].result.nodes[1].x = NaN; },
    s => { s.resources[1].result.nodes[1].depth = -.5; },
    s => { s.resources[1].provenance.sourceRows = []; },
    s => { s.resources[1].result.nodes.pop(); },
    s => { s.resources[1].ownership.mode = "generated"; },
    s => { s.resources[0].options.forest = true; },
    s => { s.resources[0].provenance.sourceRows[0].rowKey = "bad"; }
  ]) invalidState(p, change);
  const radial = p.editLayout({ options: { orientation: "radial", radius: 70, startAngle: 10, sweep: 300 } });
  invalidState(radial, s => { s.resources[1].result.nodes[1].radius = 71; }, /radial/);
  invalidState(radial, s => { s.resources[1].result.nodes[1].x++; }, /polar/);
  invalidState(radial, s => { s.resources[1].result.nodes[1].theta = 0; }, /polar/);
  const horizontal = radial.editLayout({ options: { orientation: "horizontal" } });
  assert.equal(horizontal.semanticSpec.resources[1].result.nodes[1].x, 30);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(horizontal))), serializeProgram(horizontal));
});

test("stored treemap bounds, padding and child order cannot diverge from their intent", () => {
  const p = base().layoutHierarchy({ id: "l", method: "treemap", options: { size: [120, 90], padding: 3, method: "squarify" } }).createTreemapPlot({ id: "p" });
  for (const change of [
    s => { s.resources[1].result.nodes[1].rect.x1 = -1; },
    s => { s.resources[1].result.nodes[1].content.x0 = -1; },
    s => { s.resources[1].result.nodes[1].residualRect.x1 = Infinity; },
    s => { s.resources[1].result.nodes[1].area++; },
    s => { s.resources[1].result.nodes[0].childOrder.reverse(); s.resources[1].result.nodes[0].childOrder[1] = "bad"; },
    s => { s.resources[1].options.options.size = [121, 90]; },
    s => { s.resources[1].options.options.padding = 4; }
  ]) invalidState(p, change);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(p))), serializeProgram(p));
});

test("hierarchy graphics budgets and finite placement fail before changing a valid plot", () => {
  const p = tree(), before = serializeProgram(p);
  assert.throws(() => p.editTreePlot({ origin: [Number.MAX_VALUE, Number.MAX_VALUE], labels: { offset: [Number.MAX_VALUE, 0] } }), /finite/);
  const values = [{ id: "root", parent: null, value: 1 }, ...Array.from({ length: 3500 }, (_, index) => ({ id: `n${index}`, parent: "root", value: 1 }))];
  const many = chart().createCanvas({ width: 300, height: 200 }).createData({ id: "d", values })
    .createHierarchyData({ id: "h", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "l", method: "tree", options: treeOptions }).createTreePlot({ id: "p", links: false });
  const old = serializeProgram(many);
  assert.throws(() => many.editTreePlot({ links: {}, labels: {} }), /must not exceed 10000/);
  assert.equal(serializeProgram(many), old); assert.equal(serializeProgram(p), before);
});
