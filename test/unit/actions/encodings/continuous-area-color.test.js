import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = Object.freeze([
  { x: 0, value: 1, series: "A", level: 10 },
  { x: 1, value: 2, series: "A", level: 10 },
  { x: 0, value: 2, series: "B", level: 90 },
  { x: 1, value: 3, series: "B", level: 90 }
].map(Object.freeze));
const colors = { field: "level", fieldType: "quantitative", scale: { domain: [10, 90], range: ["red", "blue"] } };
function area(values = rows, factory = chart) {
  return factory().createCanvas({ width: 320, height: 220, margin: 20 })
    .createData({ id: "data", values }).createAreaMark({ id: "bands", fill: "gold", opacity: 0.7 })
    .encodeGroup({ field: "series" }).encodeX({ field: "x" })
    .encodeYRange({ lower: { datum: 0 }, upper: "value" });
}
const fills = p => p.graphicSpec.objects.bands.items.map(item => item.properties.fill);
const commands = p => p.graphicSpec.objects.bands.items.map(item => item.properties.commands);

test("uses existing quantitative scales for one uniform color per explicit series without changing source data", () => {
  for (const factory of [chart]) {
    const before = area(rows, factory), snapshot = JSON.stringify(before);
    const p = before.encodeColor(colors);
    assert.deepEqual(fills(p), ["#ff0000", "#0000ff"]);
    assert.deepEqual(commands(p), commands(before));
    assert.deepEqual(p.semanticSpec.layers[0].encoding.group, { field: "series", fieldType: "nominal" });
    assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
    assert.equal(JSON.stringify(before), snapshot);
    assert.deepEqual(p.removeEncoding({ channel: "color" }).graphicSpec.objects.bands, before.graphicSpec.objects.bands);
    assert.equal(p.trace.children.at(-1).op, "encodeColor");
  }
});

test("treats an ungrouped area as exactly one series and never invents groups", () => {
  const base = chart().createCanvas().createData({ values: rows.slice(0, 2) })
    .createAreaMark({ id: "bands" }).encodeX({ field: "x" })
    .encodeYRange({ lower: { datum: 0 }, upper: "value" });
  assert.deepEqual(fills(base.encodeColor(colors)), ["#ff0000"]);
  assert.equal(base.encodeColor(colors).semanticSpec.layers[0].encoding.group, undefined);
  const mixed = area().removeEncoding({ channel: "group" });
  assert.throws(() => mixed.encodeColor(colors), /one value within each series/);
});

test("rejects varying, nonfinite, temporal, aggregate and unknown policies atomically", () => {
  for (const value of [11, null, "10", NaN, Infinity]) {
    const input = rows.map((row, i) => i === 1 ? { ...row, level: value } : row);
    const before = area(input), snapshot = JSON.stringify(before);
    assert.throws(() => before.encodeColor(colors));
    assert.equal(JSON.stringify(before), snapshot);
  }
  const base = area(), snapshot = JSON.stringify(base);
  for (const options of [
    { ...colors, fieldType: "temporal" }, { ...colors, aggregate: "mean" },
    { ...colors, scale: { ...colors.scale, unknown: "gray" } },
    { ...colors, layout: "stack" }
  ]) assert.throws(() => base.encodeColor(options));
  assert.equal(JSON.stringify(base), snapshot);
  const line = chart().createCanvas().createData({ values: rows }).createLineMark()
    .encodeGroup({ field: "series" }).encodeX({ field: "x" }).encodeY({ field: "value" });
  assert.throws(() => line.encodeColor(colors), /eligible layer/);
  assert.throws(() => chart().createCanvas().createData({ values: rows }).createAreaPlot({ x: "x", y: "value", color: colors }), /nominal|categorical|unsupported|requires/i);
});

for (const mode of ["overlay", "stack", "fill", "center", "diverging"]) {
  test(`keeps ${mode} geometry independent of continuous fill and outline`, () => {
    const before = area().layoutSeries({ mode }).editAreaMark({ stroke: "black", strokeWidth: 2 });
    const p = before.encodeColor(colors);
    assert.deepEqual(commands(p), commands(before));
    assert.deepEqual(fills(p), ["#ff0000", "#0000ff"]);
    for (const item of p.graphicSpec.objects.bands.items) {
      assert.equal(item.properties.stroke, "black");
      assert.equal(item.properties.strokeWidth, 2);
      assert.equal(item.properties.opacity, 0.7);
    }
  });
}

test("shares existing transformed and discretized mappings with point consumers", () => {
  for (const scale of [
    { type: "sequential" }, { type: "log" }, { type: "sqrt" },
    { type: "pow", exponent: 2 }, { type: "symlog", constant: 2 },
    { type: "quantize" }, { type: "quantile" }, { type: "threshold", domain: [50] }
  ]) {
    const options = { ...colors, scale: { ...colors.scale, ...scale } };
    const a = area().encodeColor(options);
    const point = chart().createCanvas().createData({ values: [rows[0], rows[2]] })
      .createPointMark({ id: "dots" }).encodeX({ field: "x" }).encodeY({ field: "value" }).encodeColor(options);
    assert.deepEqual(fills(a), point.graphicSpec.objects.dots.items.map(item => item.properties.fill));
    assert.deepEqual(a.resolvedScales.color.domain, point.resolvedScales.color.domain);
  }
});

test("automatic quantile samples are series-owned rather than weighted by path length", () => {
  const uneven = [rows[0], rows[1], ...Array.from({ length: 6 }, (_, i) => ({ x: i, value: 1, series: "B", level: 90 }))];
  const p = area(uneven).encodeColor({ field: "level", fieldType: "quantitative", scale: { type: "quantile", range: ["red", "blue"] } });
  assert.deepEqual(p.resolvedScales.color.domain, [10, 90]);
});

test("recomputes both real legends and fills on scale, data, canvas and persistence edits", () => {
  const p = area().editCanvas({ margin: { top: 20, right: 130, bottom: 20, left: 20 } }).encodeColor(colors).createLegend({ channels: ["color"] });
  assert.equal(p.semanticSpec.scales.filter(s => s.id === "color").length, 1);
  const reversed = p.editScale({ id: "color", reverse: true });
  assert.deepEqual(fills(reversed), ["#0000ff", "#ff0000"]);
  assert.notDeepEqual(reversed.graphicSpec.objects.colorGradientStrips, p.graphicSpec.objects.colorGradientStrips);
  const resized = p.editCanvas({ width: 420 });
  assert.deepEqual(fills(resized), fills(p));
  assert.notDeepEqual(commands(resized), commands(p));
  const restored = deserializeProgram(serializeProgram(p));
  assert.deepEqual(restored.graphicSpec, p.graphicSpec);
  assert.deepEqual(fills(restored.editScale({ id: "color", reverse: true })), fills(reversed));
  const revised = p.reviseData({ source: "data", id: "updated", values: rows.map(row => ({ ...row, level: 100 - row.level })) });
  assert.deepEqual(fills(revised), ["#0000ff", "#ff0000"]);
  const highlighted = p.highlightMarks({ select: { field: "series", op: "eq", value: "B" }, fill: "lime" });
  assert.deepEqual(fills(highlighted), ["#ff0000", "lime"]);
  assert.deepEqual(fills(p.filterMarks({ field: "series", op: "eq", value: "B" })), ["#0000ff"]);
});

test("keeps horizontal ribbons and missing-break subpaths uniformly colored", () => {
  const p = chart().createCanvas().createData({ values: rows }).createAreaMark({ id: "bands" })
    .encodeGroup({ field: "series" }).encodeY({ field: "x" })
    .encodeXRange({ lower: { datum: 0 }, upper: "value" }).encodeColor(colors);
  assert.deepEqual(fills(p), ["#ff0000", "#0000ff"]);
  const missing = [1, 2, null, 3, 4].map((value, x) => ({ x, value, series: "A", level: 10 }));
  const broken = chart().createCanvas().createData({ values: missing }).createAreaMark({ id: "bands", missing: "break" })
    .encodeGroup({ field: "series" }).encodeX({ field: "x" })
    .encodeYRange({ lower: { datum: 0 }, upper: "value" }).encodeColor(colors);
  assert.deepEqual(fills(broken), ["#ff0000", "#ff0000"]);
});

test("preserves the Basic facade boundary and its existing point color path", () => {
  assert.equal(basicChart().createAreaMark, undefined);
  const p = basicChart().createCanvas().createData({ values: [rows[0], rows[2]] })
    .createPointMark({ id: "dots" }).encodeX({ field: "x" }).encodeY({ field: "value" }).encodeColor(colors);
  assert.deepEqual(p.graphicSpec.objects.dots.items.map(item => item.properties.fill), ["#ff0000", "#0000ff"]);
});

test("reassigns categorical color and numeric fields through the existing shared scale transaction", () => {
  const base = area().encodeColor({ field: "series" });
  const numeric = base.encodeColor(colors);
  assert.deepEqual(fills(numeric), ["#ff0000", "#0000ff"]);
  assert.deepEqual(numeric.semanticSpec.layers[0].encoding.group, base.semanticSpec.layers[0].encoding.group);
  const categorical = numeric.encodeColor({ field: "series", scale: { type: "ordinal", range: ["gold", "lime"] } });
  assert.deepEqual(fills(categorical), ["gold", "lime"]);
});

test("preserves legacy centered groups when quantitative color is independent", () => {
  const base = chart().createCanvas().createData({ values: rows }).createAreaMark({ id: "bands" })
    .encodeGroup({ field: "series" }).encodeX({ field: "x" })
    .encodeY({ field: "value", stack: "center" });
  const numeric = base.encodeColor(colors);
  assert.deepEqual(commands(numeric), commands(base));
  assert.deepEqual(fills(numeric), ["#ff0000", "#0000ff"]);
  assert.deepEqual(fills(numeric.encodeGroup({ field: "series" })), fills(numeric));
});

test("uses existing symbol and discretized interval legend owners", () => {
  const base = area().editCanvas({ width: 500, margin: { top: 30, right: 220, bottom: 30, left: 30 } });
  const symbols = base.encodeColor(colors).createLegend({ channels: ["color"], representation: "symbols", values: [10, 90] });
  assert.equal(symbols.semanticSpec.scales.filter(scale => scale.id === "color").length, 1);
  assert.ok(Object.keys(symbols.graphicSpec.objects).some(key => /color.*Symbol/i.test(key)));
  const intervals = base.encodeColor({ ...colors, scale: { type: "quantize", domain: [10, 90], range: ["red", "blue"] } })
    .createLegend({ channels: ["color"] });
  assert.deepEqual(fills(intervals), ["red", "blue"]);
  assert.equal(intervals.semanticSpec.scales.filter(scale => scale.id === "color").length, 1);
});

test("rejects a density field that varies within each derived path without altering it", () => {
  const p = chart().createCanvas().createData({ values: [1, 2, 3, 4].map(value => ({ value })) })
    .createAreaMark().encodeDensity({ field: "value", bandwidth: 1 });
  const snapshot = JSON.stringify(p);
  assert.throws(() => p.encodeColor({ field: "value_value", fieldType: "quantitative" }), /one value within each series/);
  assert.equal(JSON.stringify(p), snapshot);
});

test("infers the real continuous owner when the other mark uses categorical color", () => {
  const data = [{ x: 0, y: 1, group: "A", level: 10 }, { x: 1, y: 2, group: "A", level: 10 }];
  const base = () => chart().createCanvas({ width: 600, height: 300, margin: { left: 30, top: 30, right: 220, bottom: 30 } }).createData({ values: data });
  const point = base().createScatterPlot({ x: "x", y: "y", guides: false })
    .encodeColor({ field: "level", fieldType: "quantitative", scale: { id: "pointColor" } })
    .createAreaPlot({ x: "x", y: "y", guides: false })
    .encodeColor({ field: "group", scale: { id: "areaColor" } });
  const before = serializeProgram(point);
  const pointLegend = point.createLegend({ channels: ["color"] });
  assert.equal(pointLegend.semanticSpec.guides.legend.color.scale, "pointColor");
  assert.equal(serializeProgram(point), before);
  const bands = base().createScatterPlot({ x: "x", y: "y", guides: false })
    .encodeColor({ field: "group", scale: { id: "pointColor" } })
    .createAreaPlot({ x: "x", y: "y", guides: false })
    .encodeColor({ field: "level", fieldType: "quantitative", scale: { id: "areaColor" } });
  assert.equal(bands.createLegend({ channels: ["color"] }).semanticSpec.guides.legend.color.scale, "areaColor");
});
