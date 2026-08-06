import { chart } from "../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ id: "a", category: "A", group: "G1", x: 0, y: 1, low: 0.5, high: 1.5, value: 1, order: 2 }),
  Object.freeze({ id: "b", category: "A", group: "G2", x: 1, y: 3, low: 2, high: 4, value: 3, order: 1 }),
  Object.freeze({ id: "c", category: "B", group: "G1", x: 2, y: 4, low: 3, high: 5, value: 4, order: 3 }),
  Object.freeze({ id: "d", category: "B", group: "G2", x: 3, y: 7, low: 6, high: 8, value: 7, order: 4 })
]);

function source() {
  return chart()
    .createCanvas({ width: 360, height: 260, margin: 40 })
    .createData({ id: "rows", values: rows });
}

function points() {
  return source()
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" });
}

function cartesianGuides() {
  return points().createGuides({
    grid: { horizontal: {}, vertical: {} }
  });
}

function polar() {
  return source()
    .createPointMark({ id: "polarPoints" })
    .encodeTheta({ target: "polarPoints", field: "x" })
    .encodeR({ target: "polarPoints", field: "value", scale: { zero: true } });
}

function polarAxes() {
  return polar().createThetaAxis().createRadialAxis();
}

function polarGrid() {
  return polar().createGrid();
}

function legend() {
  return points()
    .editCanvas({
      margin: { top: 70, right: 140, bottom: 50, left: 50 }
    })
    .encodeColor({ target: "points", field: "category" })
    .createLegend({ target: "points" });
}

function sizeLegend() {
  return points()
    .editCanvas({
      width: 760,
      height: 480,
      margin: { top: 70, right: 190, bottom: 50, left: 50 }
    })
    .encodeColor({ target: "points", field: "category" })
    .encodeSize({ target: "points", field: "value" })
    .encodeShape({ target: "points", field: "category" })
    .createGuides({ legend: { position: "right" } });
}

function selection() {
  return points().selectMarks({ id: "selected", target: "points", field: "x", op: "max" });
}

function errorBar() {
  return source().createErrorBar({
    id: "errorBar",
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value" }
  });
}

function errorBand() {
  return source().createErrorBand({
    id: "errorBand",
    x: { field: "x" },
    y: { center: "value", lower: "low", upper: "high" },
    groupBy: "group"
  });
}

function boxPlot() {
  return source().createBoxPlot({
    id: "boxPlot",
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value" },
    guides: false
  });
}

function gradientPlot() {
  return source().createGradientPlot({
    id: "gradientPlot",
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value" },
    density: { bandwidth: 0.5, steps: 8 },
    guides: false
  });
}

function regression() {
  return points().createRegression({ confidence: 0.9 });
}

const cartesianCreateActions = [
  "createAxes", "createXAxis", "createXAxisLabels", "createXAxisLine", "createXAxisTicks",
  "createXAxisTicksAndLabels", "createXAxisTitle", "createYAxis", "createYAxisLabels",
  "createYAxisLine", "createYAxisTicks", "createYAxisTicksAndLabels", "createYAxisTitle"
];

const cartesianEditOptions = Object.freeze({
  editXAxis: { title: { text: "Horizontal value" } },
  editXAxisLabels: { fontSize: 11 },
  editXAxisLine: { lineWidth: 2 },
  editXAxisTicks: { count: 3 },
  editXAxisTicksAndLabels: { count: 3 },
  editXAxisTitle: { text: "Horizontal value" },
  editYAxis: { title: { text: "Vertical value" } },
  editYAxisLabels: { fontSize: 11 },
  editYAxisLine: { lineWidth: 2 },
  editYAxisTicks: { count: 3 },
  editYAxisTicksAndLabels: { count: 3 },
  editYAxisTitle: { text: "Vertical value" }
});

const polarCreateActions = ["createThetaAxis", "createRadialAxis"];
const polarEditOptions = Object.freeze({
  editThetaAxis: { title: { text: "Angle" } },
  editThetaAxisLabels: { fontSize: 11 },
  editThetaAxisLine: { lineWidth: 2 },
  editThetaAxisTicks: { count: 3 },
  editThetaAxisTitle: { text: "Angle" },
  editRadialAxis: { angle: 45 },
  editRadialAxisLabels: { fontSize: 11 },
  editRadialAxisLine: { lineWidth: 2 },
  editRadialAxisTicks: { count: 3 },
  editRadialAxisTitle: { text: "Radius" }
});

const gridCreateActions = [
  "createGrid", "createHorizontalGrid", "createVerticalGrid"
];
const gridEditOptions = Object.freeze({
  editGrid: { horizontal: { color: "#cbd5e1" }, vertical: { color: "#e2e8f0" } },
  editHorizontalGrid: { color: "#cbd5e1" },
  editVerticalGrid: { color: "#e2e8f0" }
});

export const actionExamples = Object.fromEntries([
  ...cartesianCreateActions.map(name => [name, () => points()[name]()]),
  ...Object.entries(cartesianEditOptions).map(([name, options]) => [name, () => cartesianGuides()[name](options)]),
  ["removeXAxis", () => cartesianGuides().removeXAxis()],
  ["removeYAxis", () => cartesianGuides().removeYAxis()],

  ...polarCreateActions.map(name => [name, () => polar()[name]()]),
  ...Object.entries(polarEditOptions).map(([name, options]) => [name, () => polarAxes()[name](options)]),
  ["removeThetaAxis", () => polarAxes().removeThetaAxis()],
  ["removeRadialAxis", () => polarAxes().removeRadialAxis()],

  ...gridCreateActions.map(name => [name, () => points()[name]()]),
  ...Object.entries(gridEditOptions).map(([name, options]) => [name, () => cartesianGuides()[name](options)]),
  ["createThetaGrid", () => polar().createThetaGrid()],
  ["createRadialGrid", () => polar().createRadialGrid()],
  ["editThetaGrid", () => polarGrid().editThetaGrid({ count: 3 })],
  ["editRadialGrid", () => polarGrid().editRadialGrid({ count: 3 })],
  ["removeGrid", () => cartesianGuides().removeGrid()],

  ["editLegend", () => legend().editLegend({ title: "Category" })],
  ["editLegendBorder", () => legend().editLegendBorder({ border: { color: "#94a3b8" } })],
  ["editLegendLabels", () => legend().editLegendLabels({ color: "#334155" })],
  ["editLegendLayout", () => legend().editLegendLayout({ position: "right", offset: 18 })],
  ["editLegendSymbols", () => sizeLegend().editLegendSymbols({ count: 3 })],
  ["editLegendTitle", () => legend().editLegendTitle({ color: "#0f172a" })],
  ["removeLegend", () => legend().removeLegend({ target: "points" })],
  ["editTitle", () => points().editCanvas({ margin: { top: 80, right: 40, bottom: 40, left: 40 } }).createTitle({ text: "Values" }).editTitle({ subtitle: "Four observations" })],
  ["removeTitle", () => points().editCanvas({ margin: { top: 80, right: 40, bottom: 40, left: 40 } }).createTitle({ text: "Values" }).removeTitle()],

  ["createCoordinate", () => source().createCoordinate({ id: "plot", type: "cartesian" })],
  ["createScale", () => source().createScale({ id: "valueScale", type: "linear", domain: [0, 8], range: [0, 100] })],
  ["editCanvas", () => source().editCanvas({ width: 420 })],
  ["createDerivedData", () => source().createDerivedData({ id: "filtered", source: "rows", transform: [{ type: "filter", field: "category", oneOf: ["A"] }] })],
  ["createDensityData", () => source().createDensityData({ id: "density", source: "rows", field: "value", groupBy: "category", steps: 8 })],
  ["createRegressionData", () => source().createRegressionData({ id: "regression", source: "rows", x: "x", y: "y" })],
  ["createIntervalData", () => source().createIntervalData({ id: "interval", source: "rows", field: "value", groupBy: "category" })],
  ["createBin2DData", () => source().createBin2DData({ id: "bins", source: "rows", x: "x", y: "y", bins: 2 })],
  ["editBin2DData", () => source().createBin2DData({ id: "bins", source: "rows", x: "x", y: "y", bins: 2 }).editBin2DData({ target: "bins", bins: 3 })],

  ["editFacetGuides", () => points().facet({ field: "category" }).editFacetGuides({ axes: "outer" })],
  ["editFacetScales", () => points().facet({ field: "category" }).editFacetScales({ x: "independent" })],

  ["encodeParallelCoordinates", () => source().createLineMark({ id: "parallel" }).encodeParallelCoordinates({ target: "parallel", dimensions: ["x", "y", "value"], key: "id" })],
  ["encodeXRange", () => source().createBarMark({ id: "range" }).encodeY({ target: "range", field: "category", fieldType: "nominal" }).encodeXRange({ target: "range", lower: "low", upper: "high" })],
  ["encodeYRange", () => source().createBarMark({ id: "range" }).encodeX({ target: "range", field: "category", fieldType: "nominal" }).encodeYRange({ target: "range", lower: "low", upper: "high" })],
  ["encodeYOffset", () => source().createBarMark({ id: "bars" }).encodeX({ target: "bars", field: "value", aggregate: "mean" }).encodeY({ target: "bars", field: "category", fieldType: "nominal" }).encodeYOffset({ target: "bars", field: "group" })],
  ["removeEncoding", () => points().removeEncoding({ target: "points", channel: "y" })],
  ["removePathOrder", () => source().createLineMark({ id: "paths" }).encodeX({ target: "paths", field: "x" }).encodeY({ target: "paths", field: "y" }).encodeGroup({ target: "paths", field: "group" }).encodePathOrder({ target: "paths", field: "order" }).removePathOrder({ target: "paths" })],
  ["removePointRadius", () => points().encodeRadius({ target: "points", value: 5 }).removePointRadius({ target: "points" })],

  ["createRectMark", () => source().createRectMark({ id: "rects", fill: "#60a5fa" })],
  ["editArcMark", () => source().createArcMark({ id: "arcs" }).encodeTheta({ target: "arcs", field: "category", fieldType: "nominal" }).encodeR({ target: "arcs", field: "value" }).editArcMark({ target: "arcs", innerRadius: 0.35 })],
  ["editRectMark", () => source().createRectMark({ id: "rects" }).editRectMark({ target: "rects", fill: "#60a5fa" })],
  ["editTextMark", () => source().createTextMark({ id: "labels" }).encodeX({ target: "labels", field: "x" }).encodeY({ target: "labels", field: "y" }).encodeText({ target: "labels", field: "category" }).editTextMark({ target: "labels", fill: "#334155" })],
  ["editTickMark", () => source().createTickMark({ id: "ticks" }).encodeX({ target: "ticks", field: "x" }).editTickMark({ target: "ticks", length: 12 })],
  ["removeJitter", () => points().jitterPoints({ target: "points", channel: "x", maxOffset: { pixels: 4 }, key: "id" }).removeJitter({ target: "points" })],
  ["removeLabelLayout", () => source().createTextMark({ id: "labels" }).encodeX({ target: "labels", field: "x" }).encodeY({ target: "labels", field: "y" }).encodeText({ target: "labels", field: "category" }).layoutLabels({ target: "labels", maxDisplacement: 24 }).removeLabelLayout({ target: "labels" })],
  ["removeMark", () => points().removeMark({ target: "points" })],

  ["selectMarks", () => selection()],
  ["editMarkSelection", () => selection().editMarkSelection({ selection: "selected", field: "x", op: "min" })],
  ["removeMarkHighlight", () => selection().highlightMarks({ selection: "selected", fill: "#f97316" }).removeMarkHighlight({ selection: "selected" })],
  ["removeMarkSelection", () => selection().removeMarkSelection({ selection: "selected" })],

  ["createRegressionLine", () => regression()],
  ["createRegressionBand", () => regression()],
  ["editRegression", () => regression().editRegression({ line: { strokeWidth: 3 } })],
  ["editErrorBar", () => errorBar().editErrorBar({ strokeWidth: 2 })],
  ["editErrorBand", () => errorBand().editErrorBand({ opacity: 0.3 })],
  ["editErrorBandBoundary", () => errorBand().editErrorBandBoundary({ boundary: "lower", stroke: "#0369a1" })],
  ["editBoxPlot", () => boxPlot().editBoxPlot({ box: { opacity: 0.7 } })],
  ["editGradientPlot", () => gradientPlot().editGradientPlot({ width: { band: 0.6 } })],
  ["editHorizon", () => source().createAreaMark({ id: "horizon" }).encodeHorizon({ target: "horizon", x: "x", y: "y", groupBy: "group" }).editHorizon({ bands: 2 })]
]);
