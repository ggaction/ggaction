import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/ChartProgram.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { getMarkItems } from "../../../src/inspection.js";
import { resolveMarkItems } from "../../../src/materialization/selection/policies/index.js";
import { resolveHierarchyPlot } from "../../../src/materialization/hierarchy/plot.js";
import { validateResourceGraph } from "../../../src/materialization/resourceState.js";

const rows = [{ id: "r", parent: null, v: 10 }, { id: "a", parent: "r", v: 6 }, { id: "b", parent: "r", v: 4 }];
const data = () => chart().createCanvas({ width: 400, height: 300, margin: { left: 0, right: 0, top: 0, bottom: 0 } })
  .createData({ id: "d", values: rows, keyField: "id" }).createHierarchyData({ id: "h", key: "id", parent: "parent", value: "v" });
const tree = () => data().layoutHierarchy({ id: "l", method: "tree", options: { nodeSize: [20, 20], siblingGap: 40, depthGap: 60, orientation: "vertical" } }).createTreePlot({ labels: {} });
const bodies = (p, id = "treePlot") => p.graphicSpec.objects[id].items.filter(item => item.identity.role === "body");

test("tree emits links before nodes before labels with exact resource identities", () => {
  const p = tree(), graphics = p.graphicSpec.objects.treePlot.items;
  assert.deepEqual(graphics.map(item => item.type), ["line", "line", "circle", "circle", "circle", "text", "text", "text"]);
  assert.deepEqual(bodies(p).map(item => [item.properties.x, item.properties.y]), [[200, 110], [170, 190], [230, 190]]);
  assert.deepEqual(graphics.map(item => item.identity.lineage.resource.revision), Array(8).fill(0));
  assert.equal(resolveMarkItems(p, "treePlot").length, 3);
  assert.equal(getMarkItems(p).length, 3);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
});

test("tree appearance edits preserve layout and remove optional graphics explicitly", () => {
  const p = tree(), layout = p.semanticSpec.resources.find(r => r.kind === "layout"), old = serializeProgram(p);
  const q = p.editTreePlot({ nodes: { radius: 9, opacity: 0, overrides: [{ key: "a", fill: "orange" }] }, labels: false, links: false });
  assert.equal(q.semanticSpec.resources.find(r => r.kind === "layout"), layout);
  assert.equal(q.graphicSpec.objects.treePlot.items.length, 3);
  assert.equal(bodies(q)[1].properties.fill, "orange");
  assert.ok(bodies(q).every(item => item.properties.radius === 9 && item.properties.opacity === 0));
  assert.equal(q.editTreePlot({ labels: {}, links: {} }).graphicSpec.objects.treePlot.items.length, 8);
  assert.equal(serializeProgram(p), old);
  assert.throws(() => p.editTreePlot({}), /nonempty/);
  assert.throws(() => p.editTreePlot({ nodes: { overrides: [{ key: "missing", fill: "red" }] } }), /exist/);
  assert.throws(() => p.editTreePlot({ nodes: { overrides: [{ key: "a", fill: "red" }, { key: "a", fill: "blue" }] } }), /unique/);
});

test("tree orientation and Canvas edits distinguish stored layout from auto placement", () => {
  const p = tree(), q = p.editLayout({ options: { orientation: "horizontal" } });
  assert.deepEqual(bodies(q).map(item => [item.properties.x, item.properties.y]), [[160, 150], [240, 120], [240, 180]]);
  const layout = q.semanticSpec.resources.find(r => r.kind === "layout"), resized = q.editCanvas({ width: 600 });
  assert.equal(resized.semanticSpec.resources.find(r => r.kind === "layout"), layout);
  assert.equal(bodies(resized)[0].properties.x, 260);
  const fixed = q.editTreePlot({ origin: [20, 30], clip: true });
  assert.deepEqual(bodies(fixed.editCanvas({ width: 600 }))[0].properties, bodies(fixed)[0].properties);
  assert.deepEqual(fixed.graphicSpec.objects.treePlot.clip, { x: 0, y: 0, width: 400, height: 300 });
});

test("node highlight includes its label, preserves links and restores its baseline", () => {
  const p = tree(), links = p.graphicSpec.objects.treePlot.items.filter(i => i.type === "line");
  const q = p.highlightMarks({ id: "selected", target: "treePlot", select: { field: "id", op: "eq", value: "a" }, fill: "red" });
  assert.equal(q.graphicSpec.objects.treePlot.items.filter(i => i.properties.fill === "red").length, 2);
  assert.deepEqual(q.graphicSpec.objects.treePlot.items.filter(i => i.type === "line"), links);
  assert.equal(renderToSVG(q.removeMarkHighlight({ selection: "selected" })), renderToSVG(p));
  const changed = q.editLayout({ options: { depthGap: 100 } });
  assert.equal(changed.graphicSpec.objects.treePlot.items.filter(i => i.properties.fill === "red").length, 2);
});

test("row selections follow exact source keys through revision and cannot move to a replacement node", () => {
  const p = tree().highlightMarks({ id: "picked", target: "treePlot", select: { rows: { data: "d", indices: [1] } }, fill: "red" });
  const q = p.reviseData({ source: "d", id: "d2", values: [rows[0], rows[2], { id: "a", parent: "r", v: 7 }] });
  const red = q.graphicSpec.objects.treePlot.items.filter(i => i.properties.fill === "red");
  assert.equal(red.length, 2);
  const selectedKey = resolveMarkItems(q, "treePlot").find(item => item.fields.id === "a").key;
  assert.ok(red.every(item => item.identity.key === selectedKey));
  const removed = q.reviseData({ source: "d2", id: "d3", values: [rows[0], rows[2]] });
  assert.equal(removed.graphicSpec.objects.treePlot.items.filter(i => i.properties.fill === "red").length, 0);
});

test("dormant key styles survive source removal and return only to their own key", () => {
  const p = tree().editTreePlot({ nodes: { overrides: [{ key: "a", fill: "orange" }] }, labels: { overrides: [{ key: "a", text: "Chosen" }] } });
  const q = p.reviseData({ source: "d", id: "d2", values: [rows[0], rows[2]] });
  assert.equal(bodies(q).some(item => item.properties.fill === "orange"), false);
  const layer = q.semanticSpec.layers[0];
  assert.equal(resolveHierarchyPlot(q, layer, q.markConfigs.treePlot.hierarchyPlot).diagnostics[0].code, "orphan-style");
  const r = q.reviseData({ source: "d2", id: "d3", values: rows });
  assert.equal(bodies(r).filter(item => item.properties.fill === "orange").length, 1);
  assert.equal(r.graphicSpec.objects.treePlot.items.filter(item => item.properties.text === "Chosen").length, 1);
});

test("treemap uses stored cells, keeps zero padding internal labels hidden and supports grouped targets", () => {
  const p = data().layoutHierarchy({ id: "l", method: "treemap", options: { size: [300, 200], padding: 0, method: "slice-dice" } }).createTreemapPlot({ labels: {} });
  assert.deepEqual(bodies(p, "treemapPlot").map(item => [item.properties.width, item.properties.height]), [[300, 200], [180, 200], [120, 200]]);
  assert.equal(p.graphicSpec.objects.treemapPlot.items.find(item => item.identity.role === "label").properties.opacity, 0);
  assert.equal(resolveMarkItems(p, "treemapPlot").length, 3);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
  const grouped = chart().createCanvas({ width: 200, height: 200 }).createData({ id: "d", values: [{ group: "A", v: 1 }, { group: null, v: 2 }] })
    .createHierarchyData({ id: "h", groupFields: ["group"], value: "v", missingCategory: "include" })
    .layoutHierarchy({ id: "l", method: "treemap", options: { size: [100, 100], padding: 1, method: "squarify" } })
    .createTreemapPlot({ cells: { overrides: [{ path: [null], fill: "orange" }] } });
  assert.equal(resolveMarkItems(grouped, "treemapPlot").length, 2);
  assert.equal(bodies(grouped, "treemapPlot").filter(item => item.properties.fill === "orange").length, 1);
});

test("resource removal requires explicit plot removal and preserves shared resource state", () => {
  const p = tree().createTreePlot({ id: "second", layout: "l" });
  assert.throws(() => p.removeResource({ kind: "layout", id: "l", cascade: true }), /mark/);
  const q = p.removeMark({ target: "treePlot" });
  assert.ok(q.graphicSpec.objects.second);
  assert.equal(q.semanticSpec.resources.length, 2);
  assert.throws(() => q.removeResource({ kind: "layout", id: "l" }), /mark/);
  assert.equal(q.removeMark({ target: "second" }).removeResource({ kind: "layout", id: "l" }).semanticSpec.resources.length, 1);
});

test("malformed hierarchy plot restoration fails before graphic or source interpretation", () => {
  const p = tree();
  for (const mutate of [
    state => { delete state.semanticSpec.layers[0].hierarchyBinding; },
    state => { state.semanticSpec.layers[0].hierarchyBinding.extra = true; },
    state => { state.materializationConfigs.marks.treePlot.hierarchyPlot.origin = [Infinity, 0]; },
    state => { state.semanticSpec.layers[0].hierarchyLabels.content = "unknown"; },
    state => { state.materializationConfigs.marks.treePlot.hierarchyPlot.nodes.radius = -1; }
  ]) {
    const state = structuredClone({ semanticSpec: p.semanticSpec, materializationConfigs: p.materializationConfigs }); mutate(state);
    const candidate = p._clone(state);
    assert.throws(() => validateResourceGraph(candidate));
  }
});
