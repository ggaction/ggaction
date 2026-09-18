import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const values = [{ x: 1, y: 2, lo: -1, g: "A" }, { x: 3, y: -4, lo: -6, g: "B" },
  { x: 8, y: 6, lo: 1, g: "A" }, { x: 8, y: 3, lo: 2, g: "B" }];
const base = (factory = chart) => factory().createCanvas({ width: 700, height: 500, margin: 100 }).createData({ values });
const geometry = p => p.graphicSpec.objects.barPlot.items.map(item => item.properties);

test("numeric-center bars preserve rows, numerical distance, baseline, and pixel width", () => {
  for (const factory of [chart, basicChart]) {
    const p = base(factory).createBarPlot({ x: { field: "x", scale: { domain: [0, 10], nice: false } },
      y: { field: "y", scale: { domain: [-6, 6], nice: false } }, width: { pixels: 20 }, guides: false });
    const bars = geometry(p);
    assert.deepEqual(bars.map(b => [b.x + b.width / 2, b.y, b.width, b.height]),
      [[150, 200, 20, 50], [250, 250, 20, 100], [500, 100, 20, 150], [500, 175, 20, 75]]);
    assert.deepEqual(p.semanticSpec.datasets[0].values, values);
    assert.equal(p.semanticSpec.datasets.length, 1);
    assert.equal(p.semanticSpec.layers[0].encoding.y.aggregate, undefined);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    assert.match(renderToSVG(p), /<rect/);
  }
});

test("numeric bars share ordinary scales and retain width on resize and scale edits", () => {
  const p = base().createBarPlot({ x: "x", y: "y", width: { pixels: 18 }, guides: false });
  const resized = p.editCanvas({ width: 900 });
  assert.deepEqual(p.encodeBarWidth({}).graphicSpec, p.graphicSpec);
  assert.ok(geometry(resized).every(b => b.width === 18));
  assert.notEqual(geometry(resized)[2].x, geometry(p)[2].x);
  const edited = p.editXScale({ domain: [0, 20], nice: false });
  assert.ok(geometry(edited).every(b => b.width === 18));
  const overlay = p.createScatterPlot({ id: "points", x: { field: "x", scale: { id: "x" } },
    y: { field: "y", scale: { id: "y" } }, guides: false });
  assert.deepEqual(overlay.graphicSpec.objects.points.items.map(item => item.properties.x),
    geometry(overlay).map(b => b.x + b.width / 2));
  assert.deepEqual(base().createBarPlot({ x: "x", y: "y", guides: false }).resolvedScales.y.domain, [-4, 6]);
  const positive = chart().createCanvas().createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
    .createBarPlot({ x: "x", y: "y", guides: false });
  assert.deepEqual(positive.resolvedScales.y.domain, [0, 4]);
});

test("numeric raw and interval bars support both orientations and lower-level authoring", () => {
  for (const orientation of ["vertical", "horizontal"]) {
    const raw = base().createBarPlot({ x: "x", y: "y", orientation, width: { pixels: 12 }, guides: false });
    let lower = base().createBarMark({ id: "barPlot", orientation }).encodeBarWidth({ pixels: 12 });
    lower = lower.encodeY({ field: "y" }).encodeX({ field: "x" });
    assert.deepEqual(raw.graphicSpec, lower.graphicSpec);
    const range = base().createBarPlot({
      x: orientation === "vertical" ? "x" : { lower: "lo", upper: "y" },
      y: orientation === "vertical" ? { lower: "lo", upper: "y" } : "x",
      width: { pixels: 12 }, guides: false
    });
    assert.equal(range.semanticSpec.layers[0].mark.orientation, orientation);
    assert.equal(geometry(range).length, values.length);
    assert.ok(geometry(range).every(b => (orientation === "vertical" ? b.width : b.height) === 12));
    const measure = orientation === "vertical" ? "y" : "x";
    assert.deepEqual(range.resolvedScales[measure].domain, [-6, 6]);
  }
});

test("numeric bar labels, color legends, facets, and invalid policies retain row meaning", () => {
  const p = base().createBarPlot({ x: "x", y: "y", color: "g", width: { pixels: 16 } });
  const labeled = p.createMarkLabels({ content: "value" });
  assert.deepEqual(labeled.graphicSpec.objects["barPlot-labels"].items.map(i => i.properties.text), ["2", "-4", "6", "3"]);
  assert.match(renderToSVG(labeled.facet({ field: "g" })), /<svg/);
  assert.throws(() => p.encodeBarWidth({ band: 0.5 }), /pixel width/);
  assert.throws(() => p.layoutSeries({ mode: "stack" }), /overlay/);
  assert.throws(() => p.encodeColor({ field: "g", layout: "group" }), /overlay/);
  assert.throws(() => p.encodeX2({ field: "lo" }), /measure channel/);
  assert.throws(() => p.encodeX({ field: "g", fieldType: "nominal" }), /raw quantitative/);
  assert.throws(() => p.encodeY({ field: "y", aggregate: "mean" }), /raw quantitative/);
  assert.throws(() => base().createBarPlot({ x: "x", y: "y", orientation: "diagonal" }), /orientation/);
});
