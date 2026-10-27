import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";
import { resolveFacetProgramLayout } from "../../../../src/materialization/facets.js";
import { namespaceGraphicId } from "../../../../src/materialization/compositionSnapshot.js";

const rows = Object.freeze([{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 3 }]);
const base = () => chart().createCanvas({ width: 600, height: 400, margin: 80 })
  .createData({ id: "rows", values: rows })
  .createScatterPlot({ x: "x", y: "y", guides: false });
const axis = (p = base(), options = {}) => p.createYAxis({ id: "share", position: "right", ...options });
const line = p => p.graphicSpec.objects.axis_share__Line.properties;
const snapshot = p => serializeProgram(p);

test("named axes own a stable identity, one frame, and ordinary concrete components", () => {
  const source = base(), saved = snapshot(source);
  const p = axis(source, { offset: 12, title: { text: "Share" } });
  assert.deepEqual(p.semanticSpec.guides.axis.share, {
    channel: "y", position: "right", coordinate: "main", scale: "y", title: "Share"
  });
  assert.deepEqual(p.guideConfigs.axis.share.frame, { offset: 12 });
  assert.equal(line(p).x1, 532);
  assert.deepEqual([line(p).y1, line(p).y2], [320, 80]);
  for (const component of ["Line", "Ticks", "Labels", "Title"]) {
    assert.ok(p.graphicSpec.objects[`axis_share__${component}`]);
  }
  assert.equal(snapshot(source), saved);
  assert.deepEqual(p.graphicSpec.objects.scatterPlot, source.graphicSpec.objects.scatterPlot);
  assert.deepEqual(p.semanticSpec.scales, source.semanticSpec.scales);
});

test("target omission prefers canonical identity, then a unique named owner, and rejects ambiguity", () => {
  const single = axis().editYAxisLabels({ color: "red" });
  assert.equal(single.guideConfigs.axis.share.labels.color, "red");
  const canonical = single.createYAxis().editYAxisLabels({ color: "green" });
  assert.equal(canonical.guideConfigs.axis.y.labels.color, "green");
  assert.equal(canonical.guideConfigs.axis.share.labels.color, "red");
  const pair = axis().createYAxis({ id: "left", position: "left" });
  assert.throws(() => pair.editYAxisLabels({ color: "red" }), /explicit target/u);
  for (const target of ["missing", "x", "theta"]) {
    assert.throws(() => pair.editYAxisLabels({ target, color: "red" }), /Unknown y-axis target/u);
  }
  assert.throws(() => pair.createYAxisTitle({ target: "left", scale: "x" }), /binding/u);
});

test("whole-axis movement and component lifecycle preserve siblings and remove only the final owner", () => {
  const p = axis().createYAxis();
  const saved = snapshot(p);
  assert.throws(() => p.editYAxis({ target: "share", position: "left" }), /occupied/u);
  assert.throws(() => p.editYAxisLabels({ target: "share", position: "left" }), /complete axis position/u);
  assert.throws(() => p.editYAxisLine({ position: "right" }), /occupied/u);
  assert.equal(snapshot(p), saved);
  const moved = p.removeYAxis().editYAxis({ target: "share", position: "left", offset: 5 });
  assert.equal(moved.semanticSpec.guides.axis.share.position, "left");
  assert.equal(line(moved).x1, 75);
  for (const component of ["line", "ticks", "labels", "title"]) {
    assert.equal(moved.guideConfigs.axis.share[component].position, "left");
  }
  const withoutTitle = moved.editYAxis({ target: "share", title: false });
  assert.equal(withoutTitle.semanticSpec.guides.axis.share.title, undefined);
  assert.ok(withoutTitle.graphicSpec.objects.axis_share__Labels);
  const recreated = withoutTitle.createYAxisTitle({ target: "share", text: "Again" });
  assert.equal(recreated.semanticSpec.guides.axis.share.title, "Again");
  const empty = recreated.editYAxis({ target: "share", line: false, ticksAndLabels: false, title: false });
  assert.equal(empty.semanticSpec.guides.axis, undefined);
  assert.equal(empty.guideConfigs.axis, undefined);
  assert.deepEqual(empty.graphicSpec.objects.scatterPlot, p.graphicSpec.objects.scatterPlot);
});

test("aggregate named arrays are nonempty, ordered, atomic and usable through createGuides and facades", () => {
  const options = Object.freeze({ x: false, y: Object.freeze([
    Object.freeze({ id: "left", position: "left" }),
    Object.freeze({ id: "right", position: "right" })
  ]) });
  const source = base(), saved = snapshot(source);
  const p = source.createAxes(options);
  assert.deepEqual(Object.keys(p.semanticSpec.guides.axis), ["left", "right"]);
  assert.deepEqual(p.trace.children.at(-1).children.filter(node => /create[XY]Axis$/u.test(node.op))
    .map(node => node.args.id), ["left", "right"]);
  const q = source.createGuides({ axes: options, grid: false, legend: false });
  assert.deepEqual(q.graphicSpec, p.graphicSpec);
  for (const y of [[], [{}], [{ id: "one", position: "left" }, { id: "two", position: "left" }],
    [{ id: "one", position: "left" }, { id: "one", position: "right" }], [{ id: "x" }]]) {
    assert.throws(() => source.createAxes({ x: false, y }));
    assert.equal(snapshot(source), saved);
  }
  const facade = chart().createCanvas({ width: 600, height: 400, margin: 80 })
    .createData({ id: "rows", values: rows })
    .createScatterPlot({ x: "x", y: "y", guides: { axes: options, grid: false, legend: false } });
  assertEquivalentMeaning(facade.graphicSpec, p.graphicSpec);
});

test("same-side occupancy includes every retained legacy canonical component", () => {
  const source = base().createYAxisLine({ position: "left" }).createYAxisTicks({ position: "right" });
  assert.ok(deserializeProgram(snapshot(source)));
  for (const position of ["left", "right"]) {
    assert.throws(() => axis(source, { position, offset: 100 }), /occupied/u);
  }
  for (const id of ["x", "theta", "radius", "parallel", "bad.id", ""]) {
    assert.throws(() => axis(base(), { id }));
  }
  const occupied = base().createGraphics({ id: "axis_share__Title", type: "text" });
  assert.throws(() => axis(occupied), /missing concrete/u);
});

test("named axes refresh geometry through scale, Canvas, coordinate and editable persistence", () => {
  const p = axis(base(), { offset: 12, title: { text: "Share", alongOffset: 4 } });
  const changed = p.editCanvas({ width: 700 });
  assert.equal(line(changed).x1, 632);
  assert.equal(line(deserializeProgram(snapshot(p)).editCanvas({ width: 700 })).x1, 632);
  const scaled = p.editYScale({ domain: [0, 10] });
  assert.ok(scaled.graphicSpec.objects.axis_share__Labels.items.some(item => item.properties.text === "10"));
  assert.equal(scaled.guideConfigs.axis.share.title.alongOffset, 4);
  const aspect = p.editCoordinate({ target: "main", aspect: { mode: "frame", ratio: 1 } });
  assert.notEqual(line(aspect).x1, line(p).x1);
  assert.deepEqual(p.guideConfigs.axis.share.frame, { offset: 12 });
});

test("independent standalone scales and sparse components remain live consumers", () => {
  const source = base().createYAxis().createScale({ id: "ratio", type: "linear", domain: [0, 1] });
  const p = axis(source, { scale: "ratio", coordinate: "main", line: false, title: false });
  assert.equal(p.guideConfigs.axis.share.binding.standalone, true);
  assert.deepEqual(p.resolvedScales.ratio.range, [320, 80]);
  const changed = p.editCanvas({ height: 500 }).editScale({ id: "ratio", domain: [0, 2] });
  assert.deepEqual(changed.resolvedScales.ratio.range, [420, 80]);
  assert.ok(changed.graphicSpec.objects.axis_share__Labels.items.some(item => item.properties.text === "2"));
  assert.throws(() => p.removeScale({ id: "ratio" }), /referenc|consumer/u);
});

test("multiple bound tick policies require an explicit grid sampling policy", () => {
  const p = axis(base(), { ticksAndLabels: { count: 3 } }).createYAxis({ ticksAndLabels: { count: 5 } });
  assert.throws(() => p.createHorizontalGrid(), /explicit count or values/u);
  const explicit = p.createHorizontalGrid({ count: 4 });
  assert.equal(explicit.guideConfigs.grid.horizontal.count, 4);
});

test("editable imports reject malformed named identities, mismatched sides, and orphan components", () => {
  const p = axis(), saved = JSON.parse(snapshot(p));
  for (const alter of [
    state => { delete state.semanticSpec.guides.axis.share.channel; },
    state => { state.semanticSpec.guides.axis.share.position = "top"; },
    state => { state.materializationConfigs.guides.axis.share.labels.position = "left"; },
    state => { delete state.graphicSpec.objects.axis_share__Labels; },
    state => { state.materializationConfigs.guides.axis.share.frame = { offset: -1 }; }
  ]) {
    const state = structuredClone(decodeValue(saved.payload)); alter(state);
    assert.throws(() => deserializeProgram(JSON.stringify({ ...saved, payload: encodeValue(state) })));
  }
  assert.deepEqual(deserializeProgram(snapshot(p)).graphicSpec, p.graphicSpec);
});

test("the named complete flow preserves exact decoded pixels of the same native component design", async () => {
  const options = { position: "right", offset: 10, title: { text: "Share", align: "left", alongOffset: 3 } };
  const canonical = base().createYAxis(options);
  const named = base().createYAxis({ ...options, id: "share" });
  assert.deepEqual(await renderToPNGBuffer(named), await renderToPNGBuffer(canonical));
});

test("named text collisions are checked across real occupied text bounds while legacy canonical behavior remains", () => {
  const p = base().createXAxis({ line: false, ticksAndLabels: false,
    title: { text: "Cross collision", at: "end", offset: -120, alongOffset: 20 } });
  const saved = snapshot(p);
  assert.doesNotThrow(() => p.createYAxis({ position: "right" }));
  assert.throws(() => axis(p), /independent axes require separate text bounds/u);
  assert.equal(snapshot(p), saved);
});

test("data, encoding reassignment, and mark removal refresh every named consumer", () => {
  const p = axis().createYAxis();
  const rebound = p.encodeY({ field: "x", scale: { id: "nextY" } });
  assert.equal(rebound.semanticSpec.guides.axis.share.scale, "nextY");
  assert.equal(rebound.semanticSpec.guides.axis.y.scale, "nextY");
  assert.equal(rebound.guideConfigs.axis.share.labels.scale, "nextY");
  const revised = p.reviseData({ source: "rows", id: "revised", values: rows.map(row => ({ ...row, y: row.y * 10 })) });
  assert.ok(revised.graphicSpec.objects.axis_share__Labels.items.some(item => item.properties.text === "40"));
  const removedEncoding = p.removeEncoding({ target: "scatterPlot", channel: "y" });
  assert.equal(removedEncoding.semanticSpec.guides.axis, undefined);
  const removedMark = p.removeMark({ target: "scatterPlot" });
  assert.equal(removedMark.semanticSpec.guides.axis, undefined);
});

test("named axis theme typography and explicit appearance remain independent owners", () => {
  const p = axis().editYAxisLabels({ target: "share", color: "#ff0000", fontSize: 12 });
  const theme = { base: "dark", tokens: { axisLabelFontSize: 9, axisTitleFontSize: 15 } };
  const themed = p.applyTheme({ theme });
  assert.equal(themed.guideConfigs.axis.share.labels.color, "#ff0000");
  assert.equal(themed.guideConfigs.axis.share.labels.fontSize, 12);
  assert.equal(themed.guideConfigs.axis.share.title.fontSize, 15);
  assert.equal(themed.graphicSpec.objects.axis_share__Title.properties.fontSize, 15);
  const implicit = axis().editYAxisLabels({ fontSize: 14 }).createYAxis().applyTheme({ theme });
  assert.equal(implicit.guideConfigs.axis.share.labels.fontSize, 14);
  assert.equal(implicit.guideConfigs.axis.y.labels.fontSize, 9);
});

function facetedSource() {
  return chart().createCanvas({ width: 320, height: 260, margin: 65 })
    .createData({ id: "rows", values: Array.from({ length: 5 }, (_, index) => ({
      x: index + 1, y: index + 2, z: index + 3, panel: `Panel ${index}`, row: index < 3 ? "A" : "B", column: index % 3
    })) })
    .createScatterPlot({ x: "x", y: "y", guides: false })
    .createAxes({ x: [{ id: "bottom", position: "bottom" }, { id: "top", position: "top" }],
      y: [{ id: "left", position: "left" }, { id: "right", position: "right" }] });
}

test("ragged facets retain named guides on their actual top, right, bottom and left occupied edges", () => {
  const p = facetedSource().facet({ field: "panel", columns: 3, guides: { axes: "outer", legend: false } });
  const placements = resolveFacetProgramLayout(p).layout.children;
  const expected = { top: [0, 1, 2], bottom: [2, 3, 4], left: [0, 3], right: [2, 4] };
  for (const [index, cell] of placements.entries()) {
    for (const side of Object.keys(expected)) {
      const id = namespaceGraphicId(`${p.compositionSpec.id}-${cell.id}`, `axis_${side}__Line`);
      assert.equal(p.graphicSpec.objects[id] !== undefined, expected[side].includes(index), `${side} cell ${index}`);
    }
  }
  const each = p.editFacetGuides({ axes: "each" });
  for (const cell of resolveFacetProgramLayout(each).layout.children) {
    assert.ok(each.graphicSpec.objects[namespaceGraphicId(`${each.compositionSpec.id}-${cell.id}`, "axis_right__Labels")]);
  }
  assert.deepEqual(deserializeProgram(snapshot(p)).editCompositionLayout({ gap: 20 }).graphicSpec,
    p.editCompositionLayout({ gap: 20 }).graphicSpec);
});

test("grid facets and repeated charts preserve named identities through template and layout replay", () => {
  const p = facetedSource().editYAxisLabels({ target: "right", color: "#ff0000" });
  const grid = p.facetGrid({ rows: { field: "row" }, columns: { field: "column" },
    combinations: "observed", guides: { axes: "outer", legend: false } });
  const repeated = p.repeatCharts({ channel: "x", fields: ["x", "z"], guides: { axes: "each", legend: false } });
  for (const composite of [grid, repeated]) {
    const revised = composite.editFacetSource({ program: p.editYAxisLabels({ target: "right", color: "#0000ff" }) })
      .editCompositionLayout({ gap: 20 });
    assert.ok(Object.values(revised.children).every(child => child.guideConfigs.axis.right.labels.color === "#ff0000"));
    assert.ok(Object.values(revised.children).every(child => child.semanticSpec.guides.axis.top.channel === "x"));
  }
});


test("named identity maps preserve prototype-shaped IDs without inheriting caller state", () => {
  const p = axis(base(), { id: "__proto__", title: false });
  assert.deepEqual(Object.keys(p.semanticSpec.guides.axis), ["__proto__"]);
  assert.equal(Object.hasOwn(p.guideConfigs.axis, "__proto__"), true);
  assert.equal(Object.prototype.channel, undefined);
  assert.deepEqual(deserializeProgram(snapshot(p)).graphicSpec, p.graphicSpec);
});

test("standalone named grid resources require an explicit scale when encoded and independent axes coexist", () => {
  const source = base().createScale({ id: "ratio", type: "linear", domain: [0, 1] });
  const p = axis(source, { scale: "ratio", coordinate: "main", title: false });
  assert.throws(() => p.createHorizontalGrid(), /multiple y scales/u);
  const grid = p.createHorizontalGrid({ scale: "ratio", values: [0, 0.5, 1] });
  assert.equal(grid.guideConfigs.grid.horizontal.scale, "ratio");
  assert.deepEqual(deserializeProgram(snapshot(grid)).editCanvas({ height: 500 }).graphicSpec,
    grid.editCanvas({ height: 500 }).graphicSpec);
  const standalone = chart().createCanvas({ width: 600, height: 400, margin: 80 })
    .createCoordinate({ id: "main", type: "cartesian" })
    .createScale({ id: "ratio", type: "linear", domain: [0, 1] })
    .createYAxis({ id: "share", position: "right", scale: "ratio", coordinate: "main", title: false })
    .createHorizontalGrid({ values: [0, 0.5, 1] });
  assert.equal(standalone.graphicSpec.objects.horizontalGridLines.items.length, 3);
});


test("facade guide reuse checks the named owner's retained frame offset", () => {
  const p = axis(base(), { offset: 10 });
  const saved = snapshot(p);
  assert.throws(() => p.createScatterPlot({ id: "second", x: "x", y: "y", guides: {
    axes: { x: false, y: [{ id: "share", position: "right", offset: 12 }] }, grid: false, legend: false
  } }), /different frame offset/u);
  assert.equal(snapshot(p), saved);
});
