import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { chart, render } from "../../../../src/index.js";
import { chart as basic } from "../../../../src/basic.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { referenceNeutralHclColor } from "../../../oracles/color-interpolation.js";

const values = Array.from({ length: 9 }, (_, i) => i / 8);
const rows = Object.freeze(values.map((v, i) => Object.freeze({ x: i, y: i, v, g: i % 2 ? "b" : "a" })));
const range = ["#4682b4", "#fdfdfd"];
const rgb = color => [1, 3, 5].map(i => Number.parseInt(color.slice(i, i + 2), 16) / 255);
const colors = whitePoint => values.map(t => referenceNeutralHclColor(...range.map(rgb), t, whitePoint));
const fills = p => p.graphicSpec.objects.scatterPlot.items.map(item => item.properties.fill);
const scale = (interpolate, whitePoint) => ({ domain: [0, 1], range, interpolate, whitePoint });
const source = (factory = chart) => factory().createCanvas({ width: 840, height: 800, margin: 200 })
  .createData({ values: rows }).createScatterPlot({ x: "x", y: "y", guides: false });

test("neutral HCL colors reach Full and Basic point paints and sampled legends", () => {
  for (const factory of [chart, basic]) for (const whitePoint of ["d50", "d65"]) for (const interpolate of ["hcl", "hcl-long"]) {
    const before = source(factory), snapshot = serializeProgram(before);
    const p = before.encodeColor({ field: "v", fieldType: "quantitative", scale: scale(interpolate, whitePoint) })
      .createLegend({ title: false, representation: "symbols", values });
    assert.deepEqual(fills(p), colors(whitePoint));
    assert.deepEqual(p.graphicSpec.objects.colorGradientSymbols.items.map(item => item.properties.fill), colors(whitePoint));
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
    assert.equal(serializeProgram(before), snapshot);
  }
});

test("neutral fill and stroke share mapped colors through gradient edits, resets and source replay", () => {
  const p = source().encodeColor({ field: "v", fieldType: "quantitative", scale: scale("hcl", "d50") })
    .encodeStroke({ field: "v", fieldType: "quantitative", scale: scale("hcl", "d50") })
    .createLegend({ title: false });
  const snapshot = serializeProgram(p);
  assert.deepEqual(fills(p), colors("d50"));
  assert.deepEqual(p.graphicSpec.objects.scatterPlot.items.map(item => item.properties.stroke), colors("d50"));
  const lab = source().encodeColor({ field: "v", fieldType: "quantitative", scale: scale("lab", "d50") })
    .encodeStroke({ field: "v", fieldType: "quantitative", scale: scale("lab", "d50") })
    .createLegend({ title: false });
  assert.deepEqual(p.graphicSpec, lab.graphicSpec);
  assert.equal(renderToSVG(p), renderToSVG(lab));
  const reversed = p.editColorScale({ reverse: true }).editStrokeScale({ target: "scatterPlot", reverse: true });
  assert.deepEqual(fills(reversed), colors("d50").toReversed());
  assert.deepEqual(reversed.graphicSpec.objects.scatterPlot.items.map(item => item.properties.stroke), colors("d50").toReversed());
  const reset = p.editColorScale({ whitePoint: "auto" }).editStrokeScale({ target: "scatterPlot", whitePoint: "auto" });
  assert.deepEqual(fills(reset), colors("d65"));
  assert.deepEqual(reset.graphicSpec.objects.scatterPlot.items.map(item => item.properties.stroke), colors("d65"));
  const revised = p.reviseData({ source: p.semanticSpec.datasets[0].id, id: "reversedRows", values: [...rows].reverse() });
  assert.deepEqual(fills(revised), colors("d50").toReversed());
  const faceted = p.facet({ field: "g", guides: { legend: "shared" } });
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec, faceted.graphicSpec);
  assert.deepEqual(deserializeProgram(snapshot).graphicSpec, p.graphicSpec);
  assert.equal(serializeProgram(p), snapshot);
});

test("public neutral HCL rectangles match independent primitive RGBA without pixel tolerance", () => {
  for (const whitePoint of ["d50", "d65"]) for (const interpolate of ["hcl", "hcl-long"]) {
    const p = chart().createCanvas({ width: 480, height: 270, margin: 0, background: "#ffffff" })
      .createData({ values: values.map((v, i) => ({ lo: 30 + i * 46, hi: 76 + i * 46, bottom: 160, top: 200, v })) })
      .createRectMark({ id: "swatches", stroke: false })
      .encodeXRange({ lower: "lo", upper: "hi", scale: { domain: [0, 480] } })
      .encodeYRange({ lower: "bottom", upper: "top", scale: { domain: [0, 270] } })
      .encodeColor({ field: "v", fieldType: "quantitative", scale: scale(interpolate, whitePoint) });
    const expected = createCanvas(480, 270).getContext("2d"), actual = createCanvas(480, 270).getContext("2d");
    expected.fillStyle = "#ffffff";
    expected.fillRect(0, 0, 480, 270);
    colors(whitePoint).forEach((fill, i) => { expected.fillStyle = fill; expected.fillRect(30 + i * 46, 70, 46, 40); });
    render(p, actual);
    assert.deepEqual(actual.getImageData(0, 0, 480, 270).data, expected.getImageData(0, 0, 480, 270).data);
  }
});
