import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { inspectProgram, getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
const base = () => chart().createCanvas({ width: 600, height: 440, margin: 100 })
  .createData({ values: [{ x: 1, y: 2, g: "a" }, { x: 2, y: 4, g: "b" }] });
const point = () => base().createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
const source = (p, property = "fill", index = 0) => getMarkItems(p, { target: "points" })[index].appearance.find(entry => entry.property === property).source;

test("appearance distinguishes defaults, family defaults, themes, styles and same-value explicit inputs", () => {
  const p = point();
  assert.deepEqual(source(p), { kind: "defaults", action: "createPointMark" });
  const themed = p.applyTheme({ theme: "dark" });
  assert.deepEqual(source(themed), { kind: "theme", owner: "local", name: "dark", token: "mark" });
  assert.deepEqual(source(themed.editPointMark({ fill: "#60a5fa" })), { kind: "explicit", action: "editPointMark" });
  const family = base().createScatterPlot({ id: "points", x: "x", y: "y", guides: { axes: false } });
  assert.equal(source(family).kind, "family");
  const style = base().createScatterPlot({ id: "points", x: "x", y: "y", point: { fill: "#4c78a8" }, guides: { axes: false } }).applyTheme({ theme: "dark" });
  assert.deepEqual(source(style), { kind: "style", action: "createScatterPlot" });
});

test("palette and explicit channel provenance follows the actual binding and selected conditional branch", () => {
  const theme = { base: "light", tokens: { palette: ["red", "blue"] } };
  assert.deepEqual(source(point().encodeColor({ field: "g" })), { kind: "explicit", channel: "color", action: "encodeColor" });
  assert.equal(source(point().encodeColor({ field: "g" }).applyTheme({ theme })).token, "palette");
  assert.equal(source(point().encodeColor({ field: "g", scale: { range: ["red", "blue"] } }).applyTheme({ theme })).kind, "explicit");
  const conditional = point().encodeColor({ conditions: [{ when: { version: 2, registry: "standard@1", root: { type: "binary", op: "eq", left: { type: "field", name: "g" }, right: { type: "literal", value: "a" } } }, value: { value: "pink" } }], otherwise: { field: "g" } }).applyTheme({ theme });
  assert.equal(source(conditional).kind, "explicit"); assert.equal(source(conditional, "fill", 1).token, "palette");
});

test("named highlights and complement opacity identify the winning selection without changing state", () => {
  const p = point().applyTheme({ theme: "dark" }).highlightMarks({ id: "picked", select: { field: "g", op: "eq", value: "a" }, fill: "lime", dimOthers: { opacity: 0.2 } });
  const before = serializeProgram(p);
  const selected = getMarkItems(p, { target: "points" }).findIndex(item => item.fields.g === "a");
  assert.deepEqual(source(p, "fill", selected), { kind: "interaction", selection: "picked" });
  assert.deepEqual(source(p, "opacity", 1 - selected), { kind: "interaction", selection: "picked", complement: true });
  const report = inspectProgram(p).views.find(view => view.owner.id === "points");
  assert.equal(report.appearance.find(entry => entry.property === "fill" && entry.value === "lime").source.selection, "picked");
  assert.equal(serializeProgram(p), before);
  assert.deepEqual(getMarkItems(deserializeProgram(before), { target: "points" }), getMarkItems(p, { target: "points" }));
});

test("guide property provenance uses explicit offsets and numeric theme owners", () => {
  const p = point().createAxes({ x: { line: { lineWidth: 0 } } }).applyTheme({ theme: { base: "dark", tokens: { axisStrokeWidth: 3, axisLabelGap: 24 } } });
  const appearance = inspectProgram(p, { target: { kind: "guide", id: "axis" } }).views[0].appearance;
  assert.equal(appearance.find(entry => entry.component === "x.line" && entry.property === "strokeWidth").source.kind, "explicit");
  assert.equal(appearance.find(entry => entry.component === "y.line" && entry.property === "strokeWidth").source.token, "axisStrokeWidth");
  assert.equal(appearance.find(entry => entry.component === "x.labels" && entry.property === "fill").source.kind, "theme");
});

test("nested item provenance preserves scoped identity and reset restores the earlier authority", () => {
  const child = point().applyTheme({ theme: { base: "light", tokens: { mark: "purple" } } });
  const p = hconcat({ programs: [{ id: "a", program: child }, { id: "b", program: point() }] }).applyTheme({ theme: "dark" });
  const items = getMarkItems(p, { target: { childPath: ["a"], id: "points" } });
  const a = items[0].appearance[0];
  assert.deepEqual(a.owner.childPath, ["a"]); assert.equal(a.itemKey, items[0].key);
  assert.match(a.source.owner, /^composition:/);
  const report = inspectProgram(p).views.find(view => view.owner.id === "points" && view.owner.childPath?.[0] === "a");
  assert.equal(report.appearance[0].itemKey, items[0].key);
  const restored = p.removeTheme(); assert.equal(getMarkItems(restored, { target: { childPath: ["a"], id: "points" } })[0].appearance[0].source.owner, "local");
});

test("resource body, per-node override, label and graph arrow keep distinct appearance owners", () => {
  const p = base().createData({ id: "nodes", values: [{ id: "a", parent: null, value: 2 }, { id: "b", parent: "a", value: 1 }] })
    .createHierarchyData({ id: "hierarchy", data: "nodes", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "layout", method: "tree", options: { nodeSize: [10, 10], siblingGap: 20, depthGap: 30, orientation: "vertical" } })
    .createTreePlot({ id: "tree", nodes: { opacity: 0, overrides: [{ key: "b", fill: "orange" }] }, labels: {} })
    .applyTheme({ theme: "dark" });
  const items = getMarkItems(p, { target: "tree" });
  assert.equal(items[0].appearance.find(entry => entry.component === "body" && entry.property === "fill").source.token, "mark");
  assert.equal(items[1].appearance.find(entry => entry.component === "body" && entry.property === "fill").source.kind, "style");
  assert.equal(items[0].appearance.find(entry => entry.property === "opacity").source.kind, "style");
  assert.equal(items[0].appearance.find(entry => entry.component === "label" && entry.property === "fill").source.token, "text");
  const graph = base().createData({ id: "nodes", values: [{ id: "a" }, { id: "b" }] })
    .createData({ id: "edges", values: [{ from: "a", to: "b" }] })
    .createGraphData({ id: "g", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", directed: true })
    .layoutGraph({ id: "layout", method: "circular" }).createGraphPlot({ id: "network" }).applyTheme({ theme: "dark" });
  const edge = getMarkItems(graph, { target: "network" }).find(item => item.fields.kind === "edge");
  assert.equal(edge.appearance.find(entry => entry.component === "body" && entry.property === "stroke").source.token, "mutedText");
  assert.equal(edge.appearance.find(entry => entry.component === "arrow" && entry.property === "fill").source.token, "mutedText");
});

test("legacy state without authoring evidence and baseline-dependent selections report unknown", () => {
  const p = point();
  const legacy = new p.constructor({ ...p, trace: { ...p.trace, children: [] } });
  assert.equal(source(legacy).kind, "unknown");
  const edited = p.editGraphics({ target: "points", property: "items", value: p.graphicSpec.objects.points.items.map(({ properties, identity }) => ({ type: "circle", properties: { ...properties, fill: "purple" }, identity })) });
  assert.equal(source(edited).kind, "unknown");
  const selected = p.highlightMarks({ id: "byRadius", select: { property: "radius", op: "eq", value: 3 } });
  assert.equal(source(selected).kind, "unknown");
  assert.equal(source(p.editPointMark({ opacity: 0 }), "opacity").action, "editPointMark");
  assert.equal(Object.isFrozen(getMarkItems(p)[0].appearance[0].source), true);
});

test("guide spacing and palette inspection includes parallel dimensions, legends, grids and titles", () => {
  const p = base().createParallelCoordinates({ dimensions: ["x", "y"], guides: { legend: false } })
    .applyTheme({ theme: { base: "dark", tokens: { axisLabelGap: 20, axisTitleGap: 40 } } });
  const parallel = inspectProgram(p).views.find(view => view.owner.id === "axis").appearance;
  assert.equal(parallel.find(entry => entry.component === "parallel.0.labels" && entry.property === "offset").source.token, "axisLabelGap");
  const plot = point().encodeColor({ field: "g" }).createLegend({ position: "bottom", border: true })
    .createHorizontalGrid().createTitle({ text: "Title", subtitle: "Subtitle" })
    .applyTheme({ theme: { base: "dark", tokens: { palette: ["red", "blue"], legendItemGap: 23 } } });
  const report = inspectProgram(plot);
  const legend = report.views.find(view => view.owner.id === "legend").appearance;
  assert.equal(legend.find(entry => entry.component === "color" && entry.property === "itemGap").source.token, "legendItemGap");
  assert.equal(legend.find(entry => entry.component === "color.symbol" && entry.property === "fill").source.token, "palette");
  assert.equal(report.views.find(view => view.owner.id === "grid").appearance[0].source.token, "grid");
  assert.equal(report.views.find(view => view.owner.id === "title").appearance.find(entry => entry.property === "fill").source.token, "strongText");
});


test("Parallel dimension and directed-arrow provenance retain their exact component owners", () => {
  const p = base().createParallelCoordinates({ dimensions: ["x", "y"], guides: { legend: false } })
    .editParallelAxis({ field: "x", labels: { color: "orange" } })
    .applyTheme({ theme: "dark" });
  const values = inspectProgram(p).views.find(view => view.owner.id === "axis").appearance;
  assert.equal(values.find(entry => entry.component === "parallel.0.labels" && entry.property === "fill").source.action, "editParallelAxis");
  assert.equal(values.find(entry => entry.component === "parallel.1.labels" && entry.property === "fill").source.kind, "theme");
  const graph = base().createData({ id: "nodes", values: [{ id: "a" }, { id: "b" }] })
    .createData({ id: "edges", values: [{ from: "a", to: "b" }] })
    .createGraphData({ id: "g", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", directed: true })
    .layoutGraph({ id: "layout", method: "circular" }).createGraphPlot({ id: "network", edges: { stroke: "purple", strokeWidth: 2 } });
  const edge = getMarkItems(graph, { target: "network" }).find(item => item.fields.kind === "edge");
  assert.equal(edge.appearance.find(entry => entry.component === "arrow" && entry.property === "fill").source.kind, "style");
  assert.equal(edge.appearance.find(entry => entry.component === "arrow" && entry.property === "stroke").source.kind, "family");
  assert.equal(edge.appearance.find(entry => entry.component === "arrow" && entry.property === "strokeWidth").source.kind, "family");
});


test("categorical legend provenance shares exact highlight membership with its materializer", () => {
  const p = point().encodeColor({ field: "g" }).createLegend({ position: "bottom" })
    .applyTheme({ theme: { base: "light", tokens: { palette: ["red", "blue"] } } })
    .highlightMarks({ id: "selected", select: { field: "g", op: "eq", value: "a" }, fill: "lime", dimOthers: { opacity: 0.2 } });
  const appearance = inspectProgram(p).views.find(view => view.owner.id === "legend").appearance;
  assert.deepEqual(appearance.find(entry => entry.property === "fill" && entry.value === "lime").source, { kind: "interaction", selection: "selected" });
  assert.deepEqual(appearance.find(entry => entry.property === "opacity" && entry.value === 0.2).source, { kind: "interaction", selection: "selected", complement: true });
  const legacy = new p.constructor({ ...p, trace: { ...p.trace, children: [] } });
  assert.equal(inspectProgram(legacy).views.find(view => view.owner.id === "legend").appearance[0].source.kind, "unknown");
});


test("partial-category highlights and out-of-domain rows do not invent legend selection authority", () => {
  const seed = chart().createCanvas({ width: 600, height: 400, margin: 100 })
    .createData({ values: [{ x: 1, y: 1, g: "a" }, { x: 2, y: 2, g: "a" }, { x: 3, y: 3, g: "b" }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  for (const scale of [{ domain: ["a", "b", "c"] }, { domain: ["a"], unknown: "gray" }, undefined]) {
    const p = seed.encodeColor({ field: "g", ...(scale ? { scale } : {}) }).createLegend({ position: "bottom" })
      .highlightMarks({ id: "one", select: { field: "x", op: "eq", value: 1 }, fill: "lime" });
    assert.ok(inspectProgram(p).views.find(view => view.owner.id === "legend").appearance.every(entry => entry.source.kind !== "interaction"));
  }
});
