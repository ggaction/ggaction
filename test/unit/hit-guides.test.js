import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { ChartProgram } from "../../src/ChartProgram.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { prepareProgramHitFrame } from "../../src/interaction/hitProgram.js";
import { createInteractionSession } from "../../src/interaction.js";
import { createFacetFieldTitles } from "../../examples/facet-field-titles/program.js";

const base = () => chart().createCanvas({ width: 1100, height: 900, margin: 260 })
  .createData({ values: [{ x: 0, y: 0, g: "A", v: 1 }, { x: 1, y: 1, g: "B", v: 10 }] })
  .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
const entries = (program, role) => prepareProgramHitFrame(program).entries.filter(entry => entry.metadata.role === role);
const keys = values => new Set(values.map(entry => entry.metadata.itemKey));
function inspectEntry(program, frame, entry) {
  const bounds = entry.shape.bounds, point = { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
  const session = createInteractionSession({ program }); session.dispatch({ type: "inspect", point, slop: 0 });
  const candidate = session.getState().hit.candidates.find(candidate => candidate.itemKey === entry.metadata.itemKey);
  session.destroy(); assert.ok(candidate, `Expected visible ${entry.metadata.role}`); return candidate;
}

test("axis ticks and wrapped or renamed labels retain their raw value identity", () => {
  const program = chart().createCanvas({ width: 520, height: 420, margin: { top: 40, right: 40, bottom: 170, left: 60 } })
    .createData({ values: [{ c: "Alpha category label", v: 1 }, { c: "Beta category label", v: 2 }] })
    .createPointMark().encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "v" })
    .createXAxis({ ticksAndLabels: { labels: { maxWidth: 60, wrap: "word", lineHeight: 14 } }, title: false });
  const ticks = entries(program, "axis-tick"); assert.equal(ticks.length, 8); assert.equal(keys(ticks).size, 2);
  const changed = program.editXAxisLabels({ labelMap: [{ value: "Alpha category label", label: "Renamed" }, { value: "Beta category label", label: "" }] });
  assert.deepEqual(keys(entries(changed, "axis-tick")), keys(ticks));
  assert.equal(entries(changed, "axis-tick").length, 3);
  const frame = prepareProgramHitFrame(program);
  for (const entry of ticks) inspectEntry(program, frame, entry);
  const hidden = program.editXAxis({ ticksAndLabels: false }); assert.equal(entries(hidden, "axis-tick").length, 0);
});

test("numeric and string category keys remain distinct while title lines share their owner", () => {
  const p = chart().createCanvas({ width: 500, height: 400, margin: 100 })
    .createData({ values: [{ c: 1, v: 1 }, { c: "1", v: 2 }] }).createPointMark()
    .encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "v" })
    .createXAxis({ title: { text: "Category\nvalue" } }).createTitle({ text: "Main\nsecond", subtitle: "Detail" });
  assert.equal(keys(entries(p, "axis-tick")).size, 2);
  assert.equal(keys(entries(p, "axis-title")).size, 1);
  assert.equal(entries(p, "chart-title").length, 3); assert.equal(keys(entries(p, "chart-title")).size, 2);
  const before = serializeProgram(p), restored = deserializeProgram(before);
  assert.deepEqual(prepareProgramHitFrame(restored).entries.map(e => e.metadata), prepareProgramHitFrame(p).entries.map(e => e.metadata));
  assert.equal(serializeProgram(p), before);
});

test("polar and parallel guide roles share field and value keys without targeting axis lines", () => {
  const polar = chart().createCanvas({ width: 400, height: 400, margin: 80 })
    .createData({ values: [{ a: 0, r: 1 }, { a: 10, r: 2 }] }).createPointMark()
    .encodeTheta({ field: "a" }).encodeR({ field: "r" }).createThetaAxis({ ticksAndLabels: { values: [0, 10] } })
    .createRadialAxis({ ticksAndLabels: { values: [1, 2] } });
  assert.equal(entries(polar, "axis-tick").length, 8); assert.equal(keys(entries(polar, "axis-tick")).size, 4);
  assert.equal(entries(polar, "axis-title").length, 2);
  const parallel = chart().createCanvas({ width: 600, height: 400, margin: 70 })
    .createData({ values: [{ a: 0, b: 0 }, { a: 10, b: 10 }] })
    .createParallelCoordinates({ id: "lines", dimensions: ["a", "b"], guides: { legend: false } })
    .editParallelAxis({ field: "a", ticksAndLabels: { values: [0, 10] } })
    .editParallelAxis({ field: "b", ticksAndLabels: { values: [0, 10] } });
  assert.equal(entries(parallel, "axis-tick").length, 8); assert.equal(keys(entries(parallel, "axis-tick")).size, 4);
  assert.equal(keys(entries(parallel, "axis-title")).size, 2);
  const reordered = parallel.encodeParallelCoordinates({ target: "lines", dimensions: ["b", "a"] });
  assert.deepEqual(keys(entries(reordered, "axis-tick")), keys(entries(parallel, "axis-tick")));
});

test("facet headers remain parent-owned and nested child guides retain exact child paths", () => {
  const facet = createFacetFieldTitles(), headers = entries(facet, "facet-header");
  assert.equal(headers.length, 3); assert.equal(keys(headers).size, 3); assert.ok(headers.every(entry => entry.metadata.childPath.length === 0));
  const titled = base().createXAxis().createTitle({ text: "Unit" });
  const composition = hconcat({ id: "root", programs: [{ id: "left", program: facet }, { id: "right", program: titled }] });
  const frame = prepareProgramHitFrame(composition);
  assert.ok(frame.entries.filter(entry => entry.metadata.role === "facet-header").every(entry => JSON.stringify(entry.metadata.childPath) === '["left"]'));
  const title = frame.entries.find(entry => entry.metadata.role === "chart-title");
  assert.deepEqual(inspectEntry(composition, frame, title).childPath, ["right"]);
});

const families = {
  categorical: [p => p.encodeColor({ field: "g" }), { channels: ["color"] }, 3],
  sizeOrdinal: [p => p.encodeSize({ field: "g", fieldType: "ordinal", scale: { range: [20, 80] } }), { channels: ["size"] }, 3],
  size: [p => p.encodeSize({ field: "v" }), { channels: ["size"], values: [1, 10] }, 3],
  sizeInterval: [p => p.encodeSize({ field: "v", scale: { type: "quantize", range: [20, 80] } }), { channels: ["size"] }, 3],
  opacity: [p => p.encodeOpacity({ field: "v" }), { channels: ["opacity"], values: [1, 10] }, 3],
  gradient: [p => p.encodeColor({ field: "v", fieldType: "quantitative" }), { channels: ["color"], values: [1, 10] }, 4],
  symbols: [p => p.encodeColor({ field: "v", fieldType: "quantitative" }), { channels: ["color"], representation: "symbols", values: [1, 10], clipHeight: 4 }, 3],
  interval: [p => p.encodeColor({ field: "v", fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } }), { channels: ["color"] }, 3],
  strokeGradient: [p => p.encodeStroke({ field: "v", fieldType: "quantitative" }), { channels: ["stroke"], values: [1, 10] }, 4],
  strokeInterval: [p => p.encodeStroke({ field: "v", fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } }), { channels: ["stroke"] }, 3],
  colorSize: [p => p.encodeColor({ field: "v", fieldType: "quantitative" }).encodeSize({ field: "v" }), { combine: "color-size", values: [1, 10], clipHeight: 4 }, 3],
  strokeWidth: [p => p.createLineMark({ id: "lines" }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeGroup({ field: "g" }).encodeStrokeWidth({ field: "v" }), { channels: ["strokeWidth"], values: [1, 10] }, 3]
};
for (const [name, [encode, options, count]] of Object.entries(families)) test(`${name} legend binds real samples, labels and title to stable semantic items`, () => {
  const p = encode(base()).createLegend(options), before = serializeProgram(p), frame = prepareProgramHitFrame(p), legend = frame.entries.filter(e => e.metadata.role === "legend-item");
  assert.equal(keys(legend).size, count);
  for (const entry of legend) if (entry.shape.bounds !== null) inspectEntry(p, frame, entry);
  assert.equal(serializeProgram(p), before);
  const restored = deserializeProgram(before); assert.deepEqual(keys(entries(restored, "legend-item")), keys(legend));
});

test("categorical multilayer clip samples collapse with labels and summary identity stays distinct", () => {
  const p = chart().createCanvas({ width: 600, height: 450, margin: 150 }).createData({ values: [
    { x: 0, y: 0, g: "A" }, { x: 1, y: 1, g: "B" }, { x: 2, y: 2, g: "C" }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" })
    .createLegend({ symbol: { layers: [{ type: "point", size: 8 }, { type: "line", length: 20 }] }, clipHeight: 4,
      overflow: { maxItems: 1 } });
  const legend = entries(p, "legend-item"); assert.equal(legend.length, 5); assert.equal(keys(legend).size, 3);
  const cleared = p.editLegendBlock({ target: "point", channel: "color", labelMap: [{ value: "A", label: "" }] });
  assert.equal(entries(cleared, "legend-item").length, 4);
});

test("first-hidden line summary sample shares only the summary label identity", () => {
  const p = base().createLinePlot({ id: "lines", x: "x", y: "y", groupBy: "g", guides: false })
    .encodeStroke({ field: "g", fieldType: "nominal" }).createLegend({ channels: ["stroke"],
      overflow: { maxItems: 1, summarySymbol: "first-hidden" }, symbol: { layers: [{ type: "line", length: 10 }] } });
  const legend = entries(p, "legend-item"); assert.equal(legend.length, 5); assert.equal(keys(legend).size, 3);
  const summaryLabel = legend.find(entry => prepareProgramHitFrame(p).scene.nodes.find(node => node.key === entry.nodeKey)?.properties.text === "…1 entries");
  assert.equal(legend.filter(entry => entry.metadata.itemKey === summaryLabel.metadata.itemKey).length, 2);
});

test("stale guide cardinality rejects instead of assigning the wrong semantic label", () => {
  const p = base().createXAxis(), objects = structuredClone(p.graphicSpec.objects);
  objects.xAxisLabels.items.pop();
  const forged = new ChartProgram({ ...p, graphicSpec: { ...p.graphicSpec, objects } });
  assert.throws(() => prepareProgramHitFrame(forged), /stale semantic/);
});

test("ordinal size omitted labels keep symbol values and overflow summary keys separate", () => {
  const p = base().encodeSize({ field: "g", fieldType: "ordinal", scale: { range: [20, 80] } }).createLegend({ channels: ["size"], overflow: { maxItems: 1 } })
    .editLegendBlock({ target: "points", channel: "size", labelMap: [{ value: "A", label: "" }] });
  const legend = entries(p, "legend-item"); assert.equal(legend.length, 3); assert.equal(keys(legend).size, 3);
});

test("clipped legend correspondence rejects missing glyphs and conflicting owner collections", () => {
  const p = base().encodeSize({ field: "v" }).createLegend({ channels: ["size"], values: [1, 10], clipHeight: 4 });
  const objects = structuredClone(p.graphicSpec.objects), child = objects.sizeLegendSymbols.children[0];
  objects[child].children.pop();
  const forged = new ChartProgram({ ...p, graphicSpec: { ...p.graphicSpec, objects } });
  assert.throws(() => prepareProgramHitFrame(forged), /not attached|clip sample/);
});

test("transformed quantitative label formatting preserves numeric tick identity", () => {
  const p = base().editXScale({ type: "symlog", domain: [-10, 10] }).createXAxis({ ticksAndLabels: { values: [-10, 0, 10] }, title: false });
  assert.equal(entries(p, "axis-tick").length, 6); assert.equal(keys(entries(p, "axis-tick")).size, 3);
});
