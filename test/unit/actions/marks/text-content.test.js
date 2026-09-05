import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const rows = [
  { category: "A", series: "One", value: 1 }, { category: "A", series: "Two", value: 1 },
  { category: "B", series: "One", value: 2 }, { category: "B", series: "Two", value: 4 }
];
function data(values = rows) {
  return chart().createCanvas({ width: 480, height: 360, margin: 50 }).createData({ values });
}
function bars(layout = "stack") {
  return data().createBarPlot({ x: "category", y: { field: "value", aggregate: "sum" },
    color: { field: "series", layout }, guides: false });
}
function pie() { return data().createPiePlot({ category: "category", value: "value", aggregate: "sum", guides: false }); }
function labels(p) { return p.graphicSpec.objects.text.items.map(item => item.properties.text); }

test("semantic Bar values and shares distinguish source aggregates from cumulative geometry", () => {
  for (const layout of ["stack", "fill", "group", "overlay"]) {
    const p = bars(layout).createTextMark({ source: "barPlot" }).encodeText({ content: "value" });
    assert.deepEqual(labels(p), ["1", "1", "2", "4"]);
    assert.deepEqual(labels(p.editCanvas({ width: 540 })), labels(p));
    const shares = p.encodeText({ content: "share", normalizeBy: "category", format: ".0%" });
    assert.deepEqual(labels(shares), ["50%", "50%", "33%", "67%"]);
    assert.deepEqual(shares.semanticSpec.layers.at(-1).encoding.text,
      { content: "share", normalizeBy: "category", format: ".0%" });
    const global = shares.encodeText({ content: "share", format: ".1%" });
    assert.deepEqual(labels(global), ["12.5%", "12.5%", "25.0%", "50.0%"]);
    assert.deepEqual(labels(global.encodeText({ content: "category", format: "auto" })), ["A", "A", "B", "B"]);
    if (layout === "fill") assert.deepEqual(p.resolvedScales.y.domain, [0, 1]);
  }
});

test("Pie values and shares aggregate once per final sector and renormalize after filtering", () => {
  const p = pie().createTextMark({ source: "piePlot" }).encodeText({ content: "share", format: ".0%" });
  assert.deepEqual(labels(p), ["25%", "75%"]);
  assert.deepEqual(labels(p.editArcMark({ target: "piePlot", innerRadius: 0.5 })), labels(p));
  const filtered = p.filterMarks({ target: "piePlot", field: "category", op: "eq", value: "B" });
  assert.deepEqual(labels(filtered), ["100%"]);
  assert.deepEqual(labels(p.encodeText({ content: "value", format: "auto" })), ["2", "6"]);
  const counts = data().createPiePlot({ category: "category", guides: false })
    .createTextMark().encodeText({ content: "value" });
  assert.deepEqual(labels(counts), ["2", "2"]);
  const quantitative = data().createArcMark().encodeTheta({ field: "value" })
    .createTextMark().encodeText({ content: "value" });
  assert.deepEqual(labels(quantitative), ["1", "1", "2", "4"]);
  assert.deepEqual(labels(p), ["25%", "75%"]);
});

test("content assignments replace field, constant and normalization state", () => {
  const p = bars().createTextMark().encodeText({ field: "category" });
  const q = p.encodeText({ content: "share", normalizeBy: "category", format: ".1%" });
  assert.equal(q.semanticSpec.layers.at(-1).encoding.text.field, undefined);
  const constant = q.encodeText({ value: 0.5 });
  assert.deepEqual(constant.semanticSpec.layers.at(-1).encoding.text, { datum: 0.5, format: ".1%" });
  assert.deepEqual(labels(constant), ["50.0%", "50.0%", "50.0%", "50.0%"]);
  const category = constant.encodeText({ field: "category", format: "auto" });
  assert.deepEqual(category.semanticSpec.layers.at(-1).encoding.text, { field: "category", format: "auto" });
  const value = category.encodeText({ content: "value" });
  assert.equal(value.semanticSpec.layers.at(-1).encoding.text.datum, undefined);
  assert.deepEqual(p.semanticSpec.layers.at(-1).encoding.text, { field: "category", format: "auto" });
});

test("semantic content waits for a source and replays position changes", () => {
  const p = data().createBarMark().createTextMark({ source: "bar" }).encodeText({ content: "value" });
  assert.deepEqual(labels(p), []);
  const q = p.encodeX({ target: "bar", field: "category", fieldType: "nominal" })
    .encodeY({ target: "bar", field: "value", aggregate: "sum", stack: null });
  assert.deepEqual(labels(q), ["2", "6"]);
  const mean = q.encodeY({ target: "bar", field: "value", aggregate: "mean", stack: null });
  assert.deepEqual(labels(mean), ["1", "3"]);
  assert.deepEqual(labels(q), ["2", "6"]);
});

test("invalid semantic content rejects without altering earlier state", () => {
  const p = pie().createTextMark();
  const before = JSON.stringify(p);
  for (const options of [{}, { field: "category", content: "category" }, { value: "A", content: "value" },
    { content: "unknown" }, { content: "share", normalizeBy: "category" },
    { content: "value", normalizeBy: "source" }, { value: 1, normalizeBy: "source" },
    { content: "category", format: ".1%" }]) {
    assert.throws(() => p.encodeText(options));
  }
  const independent = data().createTextMark({ data: "data" });
  assert.throws(() => independent.encodeText({ content: "share" }), /Bar or Arc source/);
  for (const value of [-1, 0]) {
    const invalid = data([{ category: "A", value }]).createBarPlot({ x: "category", y: { field: "value", aggregate: "sum" }, guides: false })
      .createTextMark();
    if (value < 0) assert.throws(() => invalid.encodeText({ content: "share" }), /non-negative/);
    else assert.deepEqual(labels(invalid.encodeText({ content: "share" })), []);
  }
  assert.equal(JSON.stringify(p), before);
});

test("histogram labels use final segment counts and bin-local denominators", () => {
  const p = data([{ value: 1, series: "One" }, { value: 1.5, series: "One" },
    { value: 1, series: "Two" }, { value: 3, series: "Two" }])
    .createBarMark().encodeX({ field: "value", bin: { boundaries: [0, 2, 4] } }).encodeY()
    .encodeColor({ field: "series" }).createTextMark().encodeText({ content: "value" });
  assert.deepEqual(labels(p).sort(), ["1", "1", "2"]);
  const shares = p.encodeText({ content: "share", normalizeBy: "category", format: ".0%" });
  assert.deepEqual(labels(shares).sort(), ["100%", "33%", "67%"]);
  assert.deepEqual(labels(shares.editCanvas({ width: 600 })).sort(), labels(shares).sort());
});

test("measured Arc shares follow semantic radius values through scale edits", () => {
  for (const operation of ["createRosePlot", "createRadialBarPlot"]) {
    const p = data()[operation]({ category: "category", value: "value", aggregate: "sum", guides: false })
      .createTextMark().encodeText({ content: "value" });
    assert.deepEqual(labels(p), ["2", "6"]);
    const shares = p.encodeText({ content: "share", format: ".0%" });
    assert.deepEqual(labels(shares.editScale({ id: "radius", domain: [0, 12] })), ["25%", "75%"]);
  }
});

test("labels added to facet children use each rebound source dataset", () => {
  const p = data([{ panel: "P1", category: "A", value: 1 }, { panel: "P1", category: "B", value: 3 },
    { panel: "P2", category: "A", value: 3 }, { panel: "P2", category: "B", value: 1 }])
    .createBarPlot({ x: "category", y: { field: "value", aggregate: "sum" }, guides: false });
  const global = p.createTextMark().encodeText({ content: "share", format: ".0%" });
  assert.deepEqual(labels(global), ["50%", "50%"]);
  // Text-bearing facet templates are not supported by the current facet contract.
  assert.throws(() => global.facet({ field: "panel" }), /does not support mark.*text/);
  const faceted = p.facet({ field: "panel", guides: { legend: false } });
  const annotated = Object.values(faceted.children).map(child => child
    .createTextMark().encodeText({ content: "share", format: ".0%" }));
  assert.deepEqual(annotated.map(labels), [["25%", "75%"], ["75%", "25%"]]);
  assert.deepEqual(labels(global), ["50%", "50%"]);
});

test("histogram source labels do not become independent bin-domain consumers", () => {
  const source = data([{ value: 1 }, { value: 1.5 }, { value: 100 }])
    .createBarMark().encodeHistogram({ field: "value", maxBins: 2 });
  const p = source.createTextMark({ text: "bin" });
  const resized = p.editCanvas({ width: 600 });
  assert.deepEqual(resized.resolvedScales.x.domain, p.resolvedScales.x.domain);
  assert.deepEqual(labels(resized), labels(p));
  const filtered = p.filterMarks({ target: "bar", channel: "x", op: "lt", value: 50 });
  const bareFiltered = source.filterMarks({ target: "bar", channel: "x", op: "lt", value: 50 });
  assert.deepEqual(filtered.resolvedScales.x.domain, bareFiltered.resolvedScales.x.domain);
  assert.deepEqual(filtered.graphicSpec.objects.bar, bareFiltered.graphicSpec.objects.bar);
  assert.deepEqual(filtered.editCanvas({ width: 600 }).resolvedScales.x.domain, filtered.resolvedScales.x.domain);
  assert.throws(() => p.createTextMark({ id: "independent", data: "data" })
    .encodeX({ target: "independent", field: "value", scale: { id: "x" } }), /unbinned consumer/);
});
