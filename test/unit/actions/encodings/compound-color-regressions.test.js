import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { normalizeFacetScalePolicies } from "../../../../src/grammar/facets/scales.js";

const rows = [
  { category: "A", sex: "F", x: 1, y: 2, level: 10 },
  { category: "A", sex: "F", x: 2, y: 3, level: 10 },
  { category: "A", sex: "M", x: 3, y: 4, level: 10 },
  { category: "A", sex: "M", x: 4, y: 5, level: 10 },
  { category: "B", sex: "F", x: 1, y: 4, level: 20 },
  { category: "B", sex: "F", x: 2, y: 5, level: 20 },
  { category: "B", sex: "M", x: 3, y: 6, level: 20 },
  { category: "B", sex: "M", x: 4, y: 7, level: 20 }
];
function base(values = rows) {
  return chart().createCanvas({ plot: { width: 300, height: 300 },
    margin: { left: 100, right: 200, top: 60, bottom: 100 } })
    .createData({ id: "data", values });
}
const layer = (p, id) => p.semanticSpec.layers.find(layer => layer.id === id);

test("changing one regression color family detaches its inferred scale without changing fitted lines", () => {
  const before = base().createRegressionPlot({ id: "plot", x: "x", y: "y",
    color: "category", groupBy: "category", guides: false });
  const snapshot = JSON.stringify(before);
  const line = before.semanticSpec.layers.find(layer => layer.mark.type === "line");
  const p = before.encodeColor({ target: "plot", field: "y", fieldType: "quantitative" });
  assert.notEqual(layer(p, "plot").encoding.color.scale, layer(p, line.id).encoding.color.scale);
  assert.deepEqual(p.graphicSpec.objects[line.id], before.graphicSpec.objects[line.id]);
  assert.equal(JSON.stringify(before), snapshot);
  assert.doesNotThrow(() => p.createGuides({ legend: { target: "plot" } }));
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  assert.throws(() => before.encodeColor({ target: "plot", field: "y", fieldType: "quantitative",
    scale: { id: layer(before, line.id).encoding.color.scale } }), /incompatible/);
});

for (const method of ["createPiePlot", "createRosePlot", "createRadialBarPlot"]) {
  test(`${method} accepts sector-constant continuous color and its inferred legend`, () => {
    const before = base()[method]({ id: "plot", category: "category", value: "y", aggregate: "sum", guides: false });
    const p = before.encodeColor({ target: "plot", field: "level", fieldType: "quantitative",
      scale: { domain: [10, 20], range: ["red", "blue"] } });
    assert.deepEqual(p.graphicSpec.objects.plot.items.map(item => item.properties.fill), ["#ff0000", "#0000ff"]);
    assert.deepEqual(p.graphicSpec.objects.plot.items.map(item => item.properties.commands),
      before.graphicSpec.objects.plot.items.map(item => item.properties.commands));
    assert.ok(p.createGuides({ axes: false, grid: false }).guideConfigs.legend.gradient);
    const interval = p.encodeColor({ target: "plot", field: "level", fieldType: "quantitative",
      scale: { type: "quantize", domain: [10, 20], range: ["red", "blue"] } });
    assert.ok(interval.createGuides({ axes: false, grid: false }).guideConfigs.legend.interval);
    assert.throws(() => before.encodeColor({ target: "plot", field: "y", fieldType: "quantitative" }), /one color value/);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  });
}

test("split violin outlines use category and split grain", () => {
  const before = base().createViolinPlot({ id: "plot", x: "category", y: "y", color: "sex",
    split: { field: "sex" }, guides: false });
  const p = before.encodeStroke({ target: "plot", field: "sex", scale: { range: ["red", "blue"] } });
  assert.deepEqual(p.graphicSpec.objects.plot.items.map(item => item.properties.stroke), ["red", "blue", "red", "blue"]);
  assert.deepEqual(p.graphicSpec.objects.plot.items.map(item => item.properties.commands),
    before.graphicSpec.objects.plot.items.map(item => item.properties.commands));
  assert.ok(p.createGuides({ legend: { target: "plot", channels: ["stroke"] } }).guideConfigs.legend.stroke);
  assert.throws(() => before.encodeStroke({ target: "plot", field: "x", fieldType: "quantitative" }), /one value within each series|must contain a finite number/);
});

test("area color and stroke are independent legend blocks, including stroke-only selection", () => {
  const p = base().createAreaPlot({ id: "plot", x: "x", y: "y", groupBy: "category",
    color: "category", guides: false }).encodeStroke({ target: "plot", field: "category" });
  assert.deepEqual(Object.keys(p.createLegend({ target: "plot" }).guideConfigs.legend), ["color", "stroke"]);
  assert.deepEqual(Object.keys(p.createGuides({ legend: { target: "plot", channels: ["stroke"] } }).guideConfigs.legend), ["stroke"]);
});

test("combined legends accept reordered equal domains and map each channel by value", () => {
  const before = base().createLineMark({ id: "plot" }).encodeX({ field: "x" })
    .encodeY({ field: "y" }).encodeColor({ field: "category", scale: { domain: ["A", "B"], range: ["red", "blue"] } })
    .encodeStrokeDash({ field: "category", scale: { domain: ["B", "A"] } });
  const p = before.createLegend();
  assert.deepEqual(p.guideConfigs.legend.series.domain, ["A", "B"]);
  const lines = p.graphicSpec.objects.seriesLegendSymbols.items;
  assert.deepEqual(lines.map(item => item.properties.stroke), ["red", "blue"]);
  assert.deepEqual(lines.map(item => item.properties.strokeDash), before.resolvedScales.strokeDash.range.slice(0, 2).reverse());
});

test("facet aliases inherit one explicit policy while explicit conflicts still fail", () => {
  const spec = { layers: [{ id: "area", encoding: { color: { scale: "c" }, stroke: { scale: "c" } } }],
    scales: [{ id: "c", type: "ordinal", domain: "auto", range: "auto" }] };
  const p = normalizeFacetScalePolicies(spec, { color: "independent" });
  assert.equal(p.channels.stroke, "independent");
  assert.equal(p.scales.c.policy, "independent");
  assert.throws(() => normalizeFacetScalePolicies(spec, { color: "independent", stroke: "shared" }), /conflicting/);
});

test("automatic guides with no eligible guide is a no-op, but explicit empty requests remain errors", () => {
  const p = base().createPiePlot({ id: "plot", category: "category", value: "y", guides: false })
    .encodeColor({ target: "plot", value: "red" });
  assert.deepEqual(p.createGuides({ axes: false, grid: false }).graphicSpec, p.graphicSpec);
  assert.throws(() => p.createGuides({ axes: false, grid: false, legend: false }), /at least one selected guide/);
  assert.throws(() => chart().createGuides(), /at least one selected guide/);
});

test("a new statistical stroke alias inherits the existing facet color policy on source replay", () => {
  const p = base(rows.map((row, index) => ({ ...row, panel: index % 2 ? "P" : "Q" })))
    .createViolinPlot({ id: "plot", x: "category", y: "y", color: "sex", split: { field: "sex" }, guides: false })
    .facet({ field: "panel", columns: 2, scales: { color: "independent" }, guides: { legend: false } });
  const revised = p.editFacetSource({ action: { method: "createStatisticalReference", options: {
    source: "plot", axis: "y", population: "boundData", groupBy: "sex", statistic: { op: "median" }
  } } });
  assert.equal(revised.compositionSpec.facet.scales.stroke, "independent");
  for (const child of Object.values(revised.children)) {
    const rule = child.semanticSpec.layers.find(layer => layer.mark.type === "rule");
    assert.equal(rule.encoding.stroke.scale, layer(child, "plot").encoding.color.scale);
    assert.equal(child.graphicSpec.objects[rule.id].items.length, 2);
  }
  assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec, revised.graphicSpec);
});
