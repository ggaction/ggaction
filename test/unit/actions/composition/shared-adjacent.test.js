import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat, vconcat } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { prepareCompositionSnapshots, compositionPlotBounds } from "../../../../src/materialization/composition.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";

function bars(values = [{ x: "A", y: 10 }, { x: "B", y: 20 }], { height = 200, top = 60, bottom = 60 } = {}) {
  return chart().createCanvas({ plot: { width: 280, height }, margin: { left: 70, right: 40, top, bottom } })
    .createData({ id: "data", values }).createBarPlot({ id: "bars", x: { field: "x", fieldType: "nominal" },
      y: { field: "y", aggregate: "sum", scale: { nice: false } } });
}
function domain(p, channel = "y") {
  return p.resolvedScales[p.semanticSpec.layers[0].encoding[channel].scale].domain;
}
function sharedDomains(p) { return Object.values(prepareCompositionSnapshots(p).children).map(child => domain(child)); }

test("adjacent line inherits source fields and aggregate while preserving one public root call", () => {
  const source = bars();
  const p = source.createAdjacentPlot({ id: "line", source: "bars" });
  assert.equal(p.trace.children.length, source.trace.children.length + 1);
  assert.equal(p.trace.children.at(-1).op, "createAdjacentPlot");
  assert.equal(p.children.line.semanticSpec.layers[0].encoding.y.aggregate, "sum");
  assert.deepEqual(sharedDomains(p), [[0, 20], [0, 20]]);
  assert.equal(source.compositionSpec, undefined);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});
test("shared domains recompute after replacement and restore independent authored domains", () => {
  const left = bars(), right = bars([{ x: "A", y: 80 }, { x: "B", y: 40 }]);
  const p = hconcat({ programs: [{ id: "left", program: left }, { id: "right", program: right }], share: { y: true }, align: "plot" });
  assert.deepEqual(sharedDomains(p), [[0, 80], [0, 80]]);
  assert.deepEqual(domain(p.children.left), [0, 20]);
  const updated = p.replaceCompositionChild({ target: "right", program: bars([{ x: "A", y: 5 }, { x: "B", y: 10 }]) });
  assert.deepEqual(sharedDomains(updated), [[0, 20], [0, 20]]);
  const independent = updated.editCompositionScales({ share: { y: false } });
  assert.deepEqual(sharedDomains(independent), [[0, 20], [0, 10]]);
  assert.deepEqual(sharedDomains(p), [[0, 80], [0, 80]]);
});
test("plot alignment matches both ends with unequal titles, margins and plot heights", () => {
  const left = bars(undefined, { height: 200, top: 85, bottom: 50 }).createTitle({ text: "Sales" });
  const right = bars(undefined, { height: 150, top: 30, bottom: 80 });
  const p = hconcat({ programs: [{ id: "left", program: left }, { id: "right", program: right }], align: "plot", share: { y: true } });
  const { children, layout } = prepareCompositionSnapshots(p);
  const frames = layout.children.map(placement => {
    const plot = resolveGraphicBounds(children[placement.id]);
    return [placement.y + plot.y, placement.y + plot.y + plot.height];
  });
  assert.deepEqual(frames, [[85, 285], [85, 285]]);
  assert.equal(resolveGraphicBounds(p.children.right).height, 150);
  assert.deepEqual(domain(children.left), domain(children.right));
});
test("four adjacent placements retain source view order and use the cross-axis sharing default", () => {
  for (const position of ["left", "right", "top", "bottom"]) {
    const p = bars().createAdjacentPlot({ id: "line", position });
    assert.deepEqual(p.compositionSpec.children, ["left", "top"].includes(position) ? ["line", "bars"] : ["bars", "line"]);
    assert.deepEqual(p.compositionSpec.share, ["left", "right"].includes(position) ? { y: true } : { x: true });
  }
});
test("sharing rejects mismatched meanings, mappings and explicit domains atomically", () => {
  const a = bars();
  const b = a.encodeY({ target: "bars", field: "y", aggregate: "count" });
  assert.throws(() => hconcat({ programs: [a, b], share: { y: true } }), /meaning/);
  const log = a.editYScale({ target: "bars", type: "sqrt" });
  assert.throws(() => hconcat({ programs: [a, log], share: { y: true } }), /mapping/);
  const fixed = a.editYScale({ target: "bars", domain: [0, 50] });
  assert.throws(() => hconcat({ programs: [fixed, fixed.editYScale({ target: "bars", domain: [0, 100] })], share: { y: true } }), /explicit domains/);
  assert.equal(a.compositionSpec, undefined);
});
test("vertical plot alignment and layout edits preserve the requested alignment", () => {
  const a = bars(), b = bars().editCanvas({ margin: { left: 100 } });
  const p = vconcat({ programs: [a, b], share: { x: true }, align: "plot" }).editCompositionLayout({ gap: 22 });
  assert.equal(p.compositionSpec.align, "plot");
  const { children, layout } = prepareCompositionSnapshots(p);
  const frames = layout.children.map(placement => {
    const plot = resolveGraphicBounds(children[placement.id]);
    return [placement.x + plot.x, placement.x + plot.x + plot.width];
  });
  assert.deepEqual(frames[0], frames[1]);
});

test("one native call can edit named marks across views without changing other marks", () => {
  const p = bars().createOverlay({ id: "trend", source: "bars" }).createAdjacentPlot({ id: "line", source: "bars" });
  const q = p.encodeColor({ target: [{ childPath: ["bars"], id: "trend" }, { childPath: ["line"], id: "line" }], value: "#ff0000" });
  assert.equal(q.trace.children.length, p.trace.children.length + 1);
  assert.equal(q.trace.children.at(-1).op, "encodeColor");
  assert.equal(q.children.bars.graphicSpec.objects.trend.items[0].properties.stroke, "#ff0000");
  assert.equal(q.children.line.graphicSpec.objects.line.items[0].properties.stroke, "#ff0000");
  assert.deepEqual(q.children.bars.graphicSpec.objects.bars, p.children.bars.graphicSpec.objects.bars);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});
test("atomic shared palette edits validate the final complete state", () => {
  const values = [{ x: "A", y: 10, group: "one" }, { x: "B", y: 20, group: "two" }];
  const a = bars(values).encodeColor({ target: "bars", field: "group" });
  const p = hconcat({ programs: [{ id: "left", program: a }, { id: "right", program: a }], share: { y: true, color: true }, align: "plot" });
  const q = p.editColorScale({ target: [{ childPath: ["left"], id: "bars" }, { childPath: ["right"], id: "bars" }], palette: "set1" });
  const views = prepareCompositionSnapshots(q).children;
  assert.equal(views.left.graphicSpec.objects.bars.items[0].properties.fill, views.right.graphicSpec.objects.bars.items[0].properties.fill);
  assert.notEqual(views.left.graphicSpec.objects.bars.items[0].properties.fill, a.graphicSpec.objects.bars.items[0].properties.fill);
  assert.throws(() => p.editColorScale({ target: { childPath: ["left"], id: "bars" }, palette: "set1" }), /mapping/);
  assert.equal(p.children.left, a);
});
test("failed scoped edits preserve source and support view-level titles", () => {
  const p = bars().createAdjacentPlot({ id: "line" });
  const before = serializeProgram(p);
  assert.throws(() => p.encodeOpacity({ target: [{ childPath: ["bars"], id: "bars" }, { childPath: ["line"], id: "missing" }], value: 0.3 }), /missing/);
  assert.equal(serializeProgram(p), before);
  const titled = p.createTitle({ target: { childPath: ["line"] }, text: "Trend" });
  assert.equal(titled.children.line.graphicSpec.objects.chartTitle.properties.text, "Trend");
  assert.equal(p.children.line.graphicSpec.objects.chartTitle, undefined);
});
test("a nested adjacent view remains addressable by an explicit child path", () => {
  const p = bars().createAdjacentPlot({ id: "line" });
  const q = p.createAdjacentPlot({ target: { childPath: ["line"] }, source: "line", id: "area", position: "bottom",
    plot: { action: "createAreaPlot", options: { x: { field: "x", fieldType: "nominal" }, y: "y" } }, share: { x: true } });
  const edited = q.encodeColor({ target: { childPath: ["line", "area"], id: "area" }, value: "#ff0000" });
  assert.equal(edited.children.line.children.area.graphicSpec.objects.area.items[0].properties.fill, "#ff0000");
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec, edited.graphicSpec);
});

test("facet and ordinary views share domains without losing parent-owned legends", () => {
  const values = [{ x: "A", y: 10, group: "one" }, { x: "B", y: 20, group: "one" }, { x: "A", y: 30, group: "two" }, { x: "B", y: 15, group: "two" }];
  const source = bars(values).encodeColor({ target: "bars", field: "group" }).createGuides();
  const faceted = source.facet({ field: "group", columns: 2, guides: { axes: "outer", legend: "shared" } });
  const p = faceted.createAdjacentPlot({ id: "line", source: "bars" });
  const views = prepareCompositionSnapshots(p).children;
  assert.equal(views.bars.compositionSpec.type, "facet");
  assert.deepEqual(domain(views.bars), domain(views.line));
  assert.throws(() => p.encodeColor({ target: { childPath: ["bars", faceted.compositionSpec.children[0]], id: "bars" }, value: "red" }), /editFacetSource/);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("nested shared domains are updated from the complete final state", () => {
  const pair = hconcat({ programs: [{ id: "a", program: bars() }, { id: "b", program: bars() }], share: { y: true }, align: "plot" });
  const high = bars([{ x: "A", y: 100 }, { x: "B", y: 50 }]);
  const p = hconcat({ programs: [{ id: "pair", program: pair }, { id: "high", program: high }], share: { y: true }, align: "plot" });
  const snapshot = prepareCompositionSnapshots(p).children;
  assert.deepEqual(sharedDomains(snapshot.pair), [[0, 100], [0, 100]]);
  assert.deepEqual(domain(snapshot.high), [0, 100]);
  assert.deepEqual(sharedDomains(p.children.pair), [[0, 20], [0, 20]]);
});

test("adjacent views inherit theme and may select a prepared dataset explicitly", () => {
  const source = bars().applyTheme({ theme: { base: "light", tokens: { fontFamily: "Arial", mark: "#ff0000" } } })
    .createData({ id: "prepared", values: [{ x: "A", y: 50 }, { x: "B", y: 75 }] });
  const p = source.createAdjacentPlot({ source: "bars", id: "area", plot: {
    action: "createAreaPlot", options: { data: "prepared", x: { field: "x", fieldType: "nominal" }, y: "y" }
  } });
  const area = p.children.area;
  assert.equal(area.semanticSpec.layers[0].data, "prepared");
  assert.equal(area.graphicSpec.objects.area.items[0].properties.fill, "#ff0000");
  assert.equal(area.materializationConfigs.theme.frames.at(-1).tokens.fontFamily, "Arial");
  assert.throws(() => source.createAdjacentPlot({ plot: { action: "createLinePlot", options: { id: "ignored" } } }), /top-level id/);
  const inferred=source.createAdjacentPlot({plot:{action:"createAreaPlot"}});
  assert.equal(inferred.children.adjacent.semanticSpec.layers[0].encoding.y.field,"y");
});

test("shared categorical domains union stable order and reset without losing authored values", () => {
  const a = bars([{ x: "B", y: 10 }, { x: "A", y: 20 }]);
  const b = bars([{ x: "C", y: 30 }, { x: "B", y: 50 }]);
  const p = vconcat({ programs: [{ id: "a", program: a }, { id: "b", program: b }], share: { x: true }, align: "plot" });
  const views = prepareCompositionSnapshots(p).children;
  assert.deepEqual(domain(views.a, "x"), ["B", "A", "C"]);
  assert.deepEqual(domain(views.b, "x"), ["B", "A", "C"]);
  assert.deepEqual(domain(p.children.a, "x"), ["B", "A"]);
  const independent = prepareCompositionSnapshots(p.editCompositionScales({ share: { x: false } })).children;
  assert.deepEqual(domain(independent.b, "x"), ["C", "B"]);
});

test("plot alignment grows a multirow facet through its source without scaling text", () => {
  const values = ["one", "two", "three"].flatMap((group, index) => [{ group, x: "A", y: index + 1 }, { group, x: "B", y: index + 2 }]);
  const faceted = bars(values, { height: 100 }).facet({ field: "group", columns: 2, spacing: "plot", gap: 70, guides: { axes: "outer" } });
  const other = bars(values, { height: 700 });
  const p = hconcat({ programs: [{ id: "facets", program: faceted }, { id: "ordinary", program: other }], align: "plot", share: { y: true } });
  const { children, layout } = prepareCompositionSnapshots(p);
  const frames = layout.children.map(placement => {
    const plot = compositionPlotBounds(children[placement.id]);
    return [placement.y + plot.y, placement.y + plot.y + plot.height];
  });
  assert.deepEqual(frames[0], frames[1]);
  const id = faceted.compositionSpec.children[0];
  assert.equal(children.facets.children[id].graphicSpec.objects.xAxisLabels.items[0].properties.fontSize,
    faceted.children[id].graphicSpec.objects.xAxisLabels.items[0].properties.fontSize);
  assert.equal(resolveGraphicBounds(faceted.children[id]).height, 100);
});
