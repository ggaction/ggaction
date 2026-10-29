import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { deserializeProgram, serializeProgram } from "../../../src/persistence.js";

const rows = [{ x: 1, y: 2, weight: 2, group: "A" }, { x: 2, y: 5, weight: 4, group: "B" }, { x: 3, y: 4, weight: 2, group: "A" }];
const base = (factory = chart) => factory().createCanvas({ width: 700, height: 500, margin: 120 })
  .createData({ values: rows });
const point = p => p.createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
const variants = [
  ["Cartesian", p => point(p).createAxes().createGrid({ horizontal: true, vertical: true })],
  ["named Cartesian", p => point(p).createYAxis({ id: "measure", position: "right" })],
  ["Polar", p => p.createPointMark().encodeTheta({ field: "x" }).encodeR({ field: "y" })
    .createThetaAxis().createRadialAxis().createGrid({ theta: true, radial: true })],
  ["Parallel", p => p.createParallelCoordinates({ dimensions: ["x", "y"], guides: { legend: false } })],
  ["categorical legend", p => point(p).encodeColor({ field: "group" }).createLegend({ border: true })],
  ["gradient legend", p => point(p).encodeColor({ field: "y", fieldType: "quantitative" }).createLegend({ border: true })],
  ["interval legend", p => point(p).encodeColor({ field: "y", fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } }).createLegend({ border: true })],
  ["opacity legend", p => point(p).encodeOpacity({ field: "y" }).createLegend({ channels: ["opacity"], border: true })],
  ["size legend", p => point(p).encodeSize({ field: "y" }).createLegend({ channels: ["size"], border: true })],
  ["combined categorical and size legend", p => point(p).encodeColor({ field: "group" }).encodeSize({ field: "y" }).createLegend({ border: true })],
  ["stroke gradient legend", p => point(p).encodeStroke({ field: "y", fieldType: "quantitative" }).createLegend({ channels: ["stroke"], border: true })],
  ["stroke interval legend", p => point(p).encodeStroke({ field: "y", fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } }).createLegend({ channels: ["stroke"], border: true })],
  ["stroke width legend", p => p.createLineMark().encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeGroup({ field: "group" }).encodeStrokeWidth({ field: "weight" }).createLegend({ channels: ["strokeWidth"], border: true })],
  ["density legend", p => p.createGradientPlot({ x: { field: "group", fieldType: "nominal" }, y: { field: "y" }, density: { bandwidth: 0.5, steps: 8 }, guides: { axes: false } })]
];

for (const [name, build] of variants) {
  test(`${name} returns to native guide colors after theme removal and offline restoration`, () => {
    const seed = base(), before = build(seed), saved = serializeProgram(before);
    const dark = before.applyTheme({ theme: "dark" });
    assert.notDeepEqual(dark.graphicSpec, before.graphicSpec);
    for (const themed of [dark, dark.applyTheme({ theme: "light" }),
      deserializeProgram(serializeProgram(dark)), build(seed.applyTheme({ theme: "dark" }))]) {
      const reset = themed.removeTheme();
      assert.deepEqual(reset.guideConfigs, before.guideConfigs);
      assert.deepEqual(reset.graphicSpec, before.graphicSpec);
      assert.deepEqual(reset.semanticSpec, before.semanticSpec);
      assert.deepEqual(reset.resolvedScales, before.resolvedScales);
    }
    assert.equal(serializeProgram(before), saved);
  });
}

test("same-as-default guide colors stay explicit through inherited and local themes", () => {
  const left = point(base()).createXAxis({ line: { color: "#334155" }, title: { color: "#334155" } });
  const right = variants[3][1](base()).editParallelAxis({ field: "x", line: { color: "#475569" }, ticks: { color: "#64748b" } });
  const parent = hconcat({ programs: [{ id: "left", program: left }, { id: "right", program: right }], gap: 20 });
  const themed = parent.applyTheme({ theme: "dark" });
  assert.equal(themed.children.left.graphicSpec.objects.xAxisLine.properties.stroke, "#334155");
  assert.equal(themed.children.left.graphicSpec.objects.xAxisTitle.properties.fill, "#334155");
  assert.deepEqual(themed.children.right.graphicSpec.objects.parallelAxisLines.items.map(item => item.properties.stroke), ["#475569", "#cbd5e1"]);
  assert.deepEqual(themed.removeTheme().graphicSpec, parent.graphicSpec);
});

test("Basic Cartesian guides keep native defaults without a Full-only authoring path", () => {
  const before = point(base(basicChart)).createAxes();
  const themed = before.applyTheme({ theme: "dark" });
  assert.equal(themed.graphicSpec.objects.xAxisLine.properties.stroke, "#cbd5e1");
  assert.deepEqual(themed.removeTheme().graphicSpec, before.graphicSpec);
});

test("density legend colors use their own roles without altering the density paint", () => {
  const before = variants.at(-1)[1](base());
  const themed = before.applyTheme({ theme: "dark" });
  assert.equal(themed.graphicSpec.objects.gradientPlotDensityLegendTitle.properties.fill, "#f8fafc");
  assert.deepEqual(themed.graphicSpec.objects.gradientPlotDensityLegendLabels.items.map(item => item.properties.fill), ["#94a3b8", "#94a3b8"]);
  assert.equal(themed.graphicSpec.objects.gradientPlotDensityLegend.properties.stroke, "#475569");
  assert.deepEqual(themed.graphicSpec.objects.gradientPlotDensityLegend.properties.fill, before.graphicSpec.objects.gradientPlotDensityLegend.properties.fill);
});

test("nested facet snapshots and shared legends retain their resolved guide colors", () => {
  const unit = point(base()).encodeColor({ field: "group" }).createAxes()
    .createLegend({ titleStyle: { color: "#334155" }, border: true });
  const facet = unit.facet({ field: "group", columns: 2, guides: { axes: "outer", legend: "shared" } });
  const inner = hconcat({ programs: [{ id: "facet", program: facet }, { id: "polar", program: variants[2][1](base()) }] });
  const outer = hconcat({ programs: [{ id: "inner", program: inner }, { id: "unit", program: unit }] });
  const before = serializeProgram(outer);
  const themed = outer.applyTheme({ theme: "dark" });
  const reset = deserializeProgram(serializeProgram(themed)).removeTheme();
  assert.deepEqual(reset.graphicSpec, outer.graphicSpec);
  const local = themed.children.inner.children.facet;
  assert.ok(Object.entries(local.graphicSpec.objects).filter(([id]) => id.endsWith("colorLegendTitle"))
    .every(([, object]) => object.properties.fill === "#334155"));
  assert.equal(serializeProgram(outer), before);
});
