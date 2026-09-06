import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";

const rows = [
  { x: 1, y: 3, group: "A" },
  { x: 2, y: 5, group: "B" }
];

function pointChart(factory = chart) {
  return factory()
    .createCanvas({ width: 640, height: 400, margin: 70 })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("applies, swaps, and removes persistent theme defaults immutably", () => {
  const base = pointChart().createAxes();
  const snapshot = JSON.stringify(base);
  const dark = base.applyTheme({ theme: "dark" });
  const light = dark.applyTheme({ theme: "light" });
  const removed = dark.removeTheme();

  assert.equal(dark.graphicSpec.objects.canvas.properties.background, "#0f172a");
  assert.equal(dark.graphicSpec.objects.point.items[0].properties.fill, "#60a5fa");
  assert.equal(dark.graphicSpec.objects.xAxisLine.properties.stroke, "#cbd5e1");
  assert.equal(dark.graphicSpec.objects.xAxisLabels.items[0].properties.fill, "#e2e8f0");
  assert.equal(dark.graphicSpec.objects.xAxisTitle.properties.fill, "#f1f5f9");
  assert.equal(light.graphicSpec.objects.canvas.properties.background, "white");
  assert.equal(removed.graphicSpec.objects.point.items[0].properties.fill, "#4c78a8");
  assert.equal(removed.materializationConfigs.theme, undefined);
  assert.equal(JSON.stringify(base), snapshot);
});

test("themes resources created later and supports the Basic entry", () => {
  const dark = pointChart(() => basicChart().applyTheme({ theme: "dark" }));
  assert.equal(dark.graphicSpec.objects.canvas.properties.background, "#0f172a");
  assert.equal(dark.graphicSpec.objects.point.items[0].properties.fill, "#60a5fa");

  const axes = dark.createAxes();
  assert.equal(axes.guideConfigs.axis.x.line.color, "#cbd5e1");
  assert.equal(axes.graphicSpec.objects.yAxisTicks.items[0].properties.stroke, "#94a3b8");
});

test("preserves custom and same-as-default local overrides", () => {
  const program = chart()
    .createCanvas({ background: "white" })
    .createData({ values: rows })
    .createPointMark({ fill: "#4c78a8" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createXAxisLine({ color: "#334155" })
    .applyTheme({ theme: "dark" });

  assert.equal(program.graphicSpec.objects.canvas.properties.background, "white");
  assert.equal(program.graphicSpec.objects.point.items[0].properties.fill, "#4c78a8");
  assert.equal(program.graphicSpec.objects.xAxisLine.properties.stroke, "#334155");
  assert.deepEqual(program.materializationConfigs.theme.overrides, [
    "c:guides.axis.x.line.color",
    "c:marks.point.fill",
    "g:canvas.background",
    "g:point.fill",
    "g:xAxisLine.stroke"
  ]);
});

test("preserves same-value styles authored through complete axis and legend facades", () => {
  const program = pointChart()
    .encodeColor({ field: "group" })
    .createAxes({
      x: {
        line: { color: "#334155" },
        ticksAndLabels: { labels: { color: "#334155" } }
      },
      y: false
    })
    .createLegend({
      labels: { color: "#334155" },
      titleStyle: { color: "#334155" },
      border: { color: "#cbd5e1" }
    })
    .applyTheme({ theme: "dark" });

  assert.equal(program.graphicSpec.objects.xAxisLine.properties.stroke, "#334155");
  assert.equal(program.graphicSpec.objects.xAxisLabels.items[0].properties.fill, "#334155");
  assert.equal(program.graphicSpec.objects.colorLegendLabels.items[0].properties.fill, "#334155");
  assert.equal(program.graphicSpec.objects.colorLegendTitle.properties.fill, "#334155");
  assert.equal(program.graphicSpec.objects.colorLegendBackground.properties.stroke, "#cbd5e1");
});

test("preserves field-driven mark and categorical legend appearance", () => {
  const base = pointChart()
    .encodeColor({ field: "group" })
    .createLegend();
  const colors = base.graphicSpec.objects.point.items.map(item => item.properties.fill);
  const symbols = base.graphicSpec.objects.colorLegendSymbols.items.map(
    item => item.properties.fill
  );
  const dark = base.applyTheme({ theme: "dark" });

  assert.deepEqual(
    dark.graphicSpec.objects.point.items.map(item => item.properties.fill),
    colors
  );
  assert.deepEqual(
    dark.graphicSpec.objects.colorLegendSymbols.items.map(item => item.properties.fill),
    symbols
  );
  assert.equal(
    dark.graphicSpec.objects.colorLegendLabels.items[0].properties.fill,
    "#e2e8f0"
  );
});

test("updates Parallel guide roles without changing semantic state", () => {
  const base = chart()
    .createCanvas({ width: 600, height: 400, margin: 70 })
    .createData({ values: [{ a: 0, b: 10 }, { a: 10, b: 20 }] })
    .createParallelCoordinates({ dimensions: ["a", "b"], guides: { legend: false } });
  const semantic = JSON.stringify(base.semanticSpec);
  const scales = JSON.stringify(base.resolvedScales);
  const dark = base.applyTheme({ theme: "dark" });

  assert.equal(dark.graphicSpec.objects.parallelAxisLines.items[0].properties.stroke, "#cbd5e1");
  assert.equal(dark.graphicSpec.objects.parallelAxisLabels.items[0].properties.fill, "#cbd5e1");
  assert.equal(dark.graphicSpec.objects.parallelAxisTitles.items[0].properties.fill, "#f1f5f9");
  assert.equal(JSON.stringify(dark.semanticSpec), semantic);
  assert.equal(JSON.stringify(dark.resolvedScales), scales);
});

test("preserves one Parallel field override while theming the other axes", () => {
  const program = chart()
    .createCanvas({ width: 600, height: 400, margin: 70 })
    .createData({ values: [{ a: 0, b: 10 }, { a: 10, b: 20 }] })
    .createParallelCoordinates({ dimensions: ["a", "b"], guides: { legend: false } })
    .editParallelAxis({ field: "a", line: { color: "#475569" } })
    .applyTheme({ theme: "dark" });

  assert.deepEqual(
    program.graphicSpec.objects.parallelAxisLines.items.map(
      item => item.properties.stroke
    ),
    ["#475569", "#cbd5e1"]
  );
});

test("themes Polar guides, chart titles, and multiple legend families", () => {
  const polar = chart()
    .createCanvas({ width: 300, height: 300, margin: 60 })
    .createData({ values: [{ a: 0, r: 0 }, { a: 10, r: 20 }] })
    .createPointMark()
    .encodeTheta({ field: "a" })
    .encodeR({ field: "r", scale: { zero: true } })
    .createThetaAxis()
    .createRadialAxis()
    .createGrid({ theta: true, radial: true })
    .createTitle({ text: "Polar", subtitle: "Theme" })
    .applyTheme({ theme: "dark" });
  assert.equal(polar.graphicSpec.objects.thetaAxisLine.properties.stroke, "#cbd5e1");
  assert.equal(polar.graphicSpec.objects.radialAxisLabels.items[0].properties.fill, "#e2e8f0");
  assert.equal(polar.graphicSpec.objects.thetaGridLines.items[0].properties.stroke, "#334155");
  assert.equal(polar.graphicSpec.objects.chartTitle.properties.fill, "#f8fafc");
  assert.equal(polar.graphicSpec.objects.chartSubtitle.properties.fill, "#94a3b8");

  const categorical = pointChart().encodeColor({ field: "group" }).createLegend();
  const size = chart()
    .createCanvas({ width: 640, height: 400, margin: { top: 50, right: 180, bottom: 50, left: 50 } })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeSize({ field: "y" })
    .createLegend({ channels: ["size"] });
  for (const program of [categorical, size]) {
    const dark = program.applyTheme({ theme: "dark" });
    const labelId = Object.keys(dark.graphicSpec.objects).find(id => /LegendLabels$/u.test(id));
    assert.equal(dark.graphicSpec.objects[labelId].items[0].properties.fill, "#e2e8f0");
  }
  assert.equal(
    size.applyTheme({ theme: "dark" })
      .graphicSpec.objects.sizeLegendSymbols.items[0].properties.fill,
    "#94a3b8"
  );
});

test("validates theme lifecycle and keeps failures atomic", () => {
  const empty = chart();
  const snapshot = JSON.stringify(empty);
  for (const operation of [
    () => empty.applyTheme(),
    () => empty.applyTheme({ theme: "unknown" }),
    () => empty.applyTheme({ theme: "dark", extra: true }),
    () => empty.removeTheme()
  ]) assert.throws(operation);
  assert.equal(JSON.stringify(empty), snapshot);
  assert.throws(() => empty.applyTheme({ theme: "dark" }).removeTheme({ extra: true }));
});

test("is idempotent for an unchanged theme", () => {
  const once = pointChart().applyTheme({ theme: "dark" });
  const twice = once.applyTheme({ theme: "dark" });
  assert.deepEqual(twice.semanticSpec, once.semanticSpec);
  assert.deepEqual(twice.graphicSpec, once.graphicSpec);
  assert.deepEqual(twice.materializationConfigs, once.materializationConfigs);
});

test("preserves a local edit made after applying a theme across later lifecycle changes", () => {
  const edited = pointChart()
    .applyTheme({ theme: "dark" })
    .editPointMark({ fill: "#60a5fa" });
  const light = edited.applyTheme({ theme: "light" });
  const removed = edited.removeTheme();

  assert.equal(light.graphicSpec.objects.point.items[0].properties.fill, "#60a5fa");
  assert.equal(removed.graphicSpec.objects.point.items[0].properties.fill, "#60a5fa");
  assert.equal(removed.materializationConfigs.theme, undefined);
});

test("themes text marks while preserving their content and position", () => {
  const base = chart()
    .createCanvas({ width: 320, height: 200, margin: 40 })
    .createData({ values: [{ x: 1, y: 2, label: "A" }] })
    .createTextMark({ id: "labels" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeText({ field: "label" });
  const before = base.graphicSpec.objects.labels.items[0].properties;
  const dark = base.applyTheme({ theme: "dark" });
  const after = dark.graphicSpec.objects.labels.items[0].properties;

  assert.equal(after.fill, "#e2e8f0");
  assert.equal(after.text, before.text);
  assert.equal(after.x, before.x);
  assert.equal(after.y, before.y);
});

test("themes continuous legend chrome without recoloring data gradients", () => {
  const values = [
    { x: 1, y: 3, group: "A", weight: 2 },
    { x: 2, y: 5, group: "A", weight: 2 },
    { x: 1, y: 4, group: "B", weight: 5 },
    { x: 2, y: 6, group: "B", weight: 5 }
  ];
  const source = () => chart()
    .createCanvas({
      width: 640,
      height: 400,
      margin: { top: 50, right: 180, bottom: 50, left: 50 }
    })
    .createData({ values });
  const gradient = source()
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "y", fieldType: "quantitative" })
    .createLegend({ channels: ["color"] });
  const width = source()
    .createLineMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeGroup({ field: "group" })
    .encodeStrokeWidth({ field: "weight" })
    .createLegend({ channels: ["strokeWidth"] });
  const gradientFills = gradient.graphicSpec.objects.colorGradientStrips.items.map(
    item => item.properties.fill
  );
  const themedGradient = gradient.applyTheme({ theme: "dark" });
  const themedWidth = width.applyTheme({ theme: "dark" });

  assert.deepEqual(
    themedGradient.graphicSpec.objects.colorGradientStrips.items.map(
      item => item.properties.fill
    ),
    gradientFills
  );
  assert.equal(
    themedGradient.graphicSpec.objects.colorGradientTicks.items[0].properties.stroke,
    "#94a3b8"
  );
  assert.equal(
    themedWidth.graphicSpec.objects.strokeWidthLegendSymbols.items[0].properties.stroke,
    "#60a5fa"
  );
});

test("does not change regression values, domains, ordering, or palette assignments", () => {
  const values = [
    { x: 1, y: 2, group: "A" },
    { x: 2, y: 4, group: "A" },
    { x: 3, y: 5, group: "A" },
    { x: 1, y: 4, group: "B" },
    { x: 2, y: 5, group: "B" },
    { x: 3, y: 7, group: "B" }
  ];
  const base = chart()
    .createCanvas({ width: 640, height: 400, margin: 60 })
    .createData({ values })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .createRegression();
  const semantic = JSON.stringify(base.semanticSpec);
  const scales = JSON.stringify(base.resolvedScales);
  const order = JSON.stringify(base.graphicSpec.order);
  const lineColors = base.graphicSpec.objects.pointsRegressionLines.items.map(
    item => item.properties.stroke
  );
  const dark = base.applyTheme({ theme: "dark" });

  assert.equal(JSON.stringify(dark.semanticSpec), semantic);
  assert.equal(JSON.stringify(dark.resolvedScales), scales);
  assert.equal(JSON.stringify(dark.graphicSpec.order), order);
  assert.deepEqual(
    dark.graphicSpec.objects.pointsRegressionLines.items.map(
      item => item.properties.stroke
    ),
    lineColors
  );
  assert.equal(
    dark.graphicSpec.objects.pointsRegressionBands.items[0].properties.fill,
    "#f8fafc"
  );
});

test("makes legacy dark component defaults readable and preserves explicit equivalents", () => {
  const values = [
    { category: "A", value: 1 },
    { category: "A", value: 2 },
    { category: "A", value: 20 },
    { category: "B", value: 3 },
    { category: "B", value: 4 },
    { category: "B", value: 5 }
  ];
  const base = chart()
    .createCanvas()
    .createData({ values })
    .createBoxPlot({
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value" }
    });
  const dark = base.applyTheme({ theme: "dark" });
  const explicit = chart()
    .createCanvas()
    .createData({ values })
    .createBoxPlot({
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value" },
      median: { stroke: "#1f2937" }
    })
    .applyTheme({ theme: "dark" });

  assert.equal(
    dark.graphicSpec.objects.boxPlotMedian.items[0].properties.stroke,
    "#f8fafc"
  );
  assert.equal(
    dark.graphicSpec.objects.boxPlotWhisker.items[0].properties.stroke,
    "#f8fafc"
  );
  assert.equal(
    explicit.graphicSpec.objects.boxPlotMedian.items[0].properties.stroke,
    "#1f2937"
  );
  assert.equal(
    dark.removeTheme().graphicSpec.objects.boxPlotMedian.items[0].properties.stroke,
    "#1f2937"
  );
  assert.equal(
    base.applyTheme({ theme: "light" })
      .graphicSpec.objects.boxPlotWhisker.items[0].properties.stroke,
    "#111111"
  );
});

test("themes reference defaults and keeps explicitly authored reference colors", () => {
  const source = pointChart();
  const defaults = source
    .createReferenceLine({ y: 4 })
    .createReferenceBand({ y: [3.5, 4.5] })
    .applyTheme({ theme: "dark" });
  const explicit = source
    .createReferenceLine({ id: "threshold", y: 4, stroke: "#64748b" })
    .applyTheme({ theme: "dark" });

  assert.equal(
    defaults.graphicSpec.objects.referenceLine.items[0].properties.stroke,
    "#94a3b8"
  );
  assert.equal(defaults.graphicSpec.objects.referenceBand.items[0].properties.fill, "#94a3b8");
  assert.equal(
    explicit.graphicSpec.objects.threshold.items[0].properties.stroke,
    "#64748b"
  );
  assert.equal(
    defaults.removeTheme().graphicSpec.objects.referenceLine.items[0].properties.stroke,
    "#64748b"
  );
});

test("drops a removed mark's local binding before the same id is recreated", () => {
  const recreated = pointChart()
    .editPointMark({ fill: "#4c78a8" })
    .applyTheme({ theme: "dark" })
    .removeMark({ target: "point" })
    .createPointMark({ id: "point" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  assert.equal(
    recreated.graphicSpec.objects.point.items[0].properties.fill,
    "#60a5fa"
  );
});

test("honors a low-level graphic item override without freezing its siblings", () => {
  const program = pointChart()
    .editGraphics({ target: "point:0", property: "fill", value: "#4c78a8" })
    .applyTheme({ theme: "dark" });
  assert.deepEqual(
    program.graphicSpec.objects.point.items.map(item => item.properties.fill),
    ["#4c78a8", "#60a5fa"]
  );
});

test("preserves same-value appearance authored through a chart facade", () => {
  const program = chart()
    .createCanvas()
    .createData({ values: rows })
    .createScatterPlot({
      x: "x",
      y: "y",
      point: { fill: "#4c78a8" },
      guides: false
    })
    .applyTheme({ theme: "dark" });
  assert.equal(
    program.graphicSpec.objects.scatterPlot.items[0].properties.fill,
    "#4c78a8"
  );
});

test("preserves explicit component colors authored at composite action boundaries", () => {
  const values = [
    { x: 1, y: 2 },
    { x: 1, y: 4 },
    { x: 2, y: 5 },
    { x: 2, y: 7 }
  ];
  const source = () => chart()
    .createCanvas()
    .createData({ values });
  const errorBar = source()
    .createErrorBar({
      x: { field: "x", fieldType: "quantitative" },
      y: { field: "y" },
      stroke: "#4c78a8"
    })
    .applyTheme({ theme: "dark" });
  const errorBand = source()
    .createErrorBand({
      x: { field: "x", fieldType: "quantitative" },
      y: { field: "y" },
      fill: "#4c78a8",
      boundaries: { stroke: "#4c78a8" }
    })
    .applyTheme({ theme: "dark" });
  const annotation = pointChart()
    .createAnnotation({
      text: "note",
      space: "plot",
      x: 0.5,
      y: 0.5,
      fill: "#334155"
    })
    .applyTheme({ theme: "dark" });

  for (const id of ["errorBar", "errorBarLowerCap", "errorBarUpperCap"]) {
    assert.equal(
      errorBar.graphicSpec.objects[id].items[0].properties.stroke,
      "#4c78a8"
    );
  }
  assert.equal(
    errorBand.graphicSpec.objects.errorBand.items[0].properties.fill,
    "#4c78a8"
  );
  for (const id of ["errorBandLowerBoundary", "errorBandUpperBoundary"]) {
    assert.equal(
      errorBand.graphicSpec.objects[id].items[0].properties.stroke,
      "#4c78a8"
    );
  }
  assert.equal(
    annotation.graphicSpec.objects.annotation.items[0].properties.fill,
    "#334155"
  );
});

test("preserves an explicit regression band color at the high-level facade", () => {
  const values = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 5 },
    { x: 4, y: 8 }
  ];
  const program = chart()
    .createCanvas()
    .createData({ values })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createRegression({ band: { color: "#111111" } })
    .applyTheme({ theme: "dark" });

  assert.equal(
    program.graphicSpec.objects.pointsRegressionBands.items[0].properties.fill,
    "#111111"
  );
});

test("drops stale guide and component bindings when their resources are reset", () => {
  const guide = pointChart()
    .encodeColor({ field: "group" })
    .createXAxisLine({ color: "#475569" })
    .createLegend({ labels: { color: "#334155" } })
    .applyTheme({ theme: "dark" })
    .removeXAxis()
    .createXAxisLine()
    .removeLegend()
    .createLegend();
  const values = [
    { x: 1, y: 2 },
    { x: 1, y: 4 },
    { x: 2, y: 5 },
    { x: 2, y: 7 }
  ];
  const band = chart()
    .createCanvas()
    .createData({ values })
    .createErrorBand({
      x: { field: "x", fieldType: "quantitative" },
      y: { field: "y" },
      fill: "#4c78a8"
    })
    .applyTheme({ theme: "dark" })
    .editErrorBand({ fill: false });

  assert.equal(guide.graphicSpec.objects.xAxisLine.properties.stroke, "#cbd5e1");
  assert.equal(
    guide.graphicSpec.objects.colorLegendLabels.items[0].properties.fill,
    "#e2e8f0"
  );
  assert.equal(
    band.graphicSpec.objects.errorBand.items[0].properties.fill,
    "#60a5fa"
  );
});
