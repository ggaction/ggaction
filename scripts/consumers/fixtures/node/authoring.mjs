import { fileURLToPath as consumerPath } from "node:url";
import assert from "node:assert/strict";
import { chart, hconcat, render, vconcat } from "ggaction";
import { chart as basicChart, render as basicRender } from "ggaction/basic";
import { action, ChartProgram, registerExtension } from "ggaction/extension";
import { renderToPDF, renderToPDFBuffer } from "ggaction/pdf";
import { renderToPNG, renderToPNGBuffer } from "ggaction/png";
import { renderToSVG } from "ggaction/svg";
import { createTransitionScene } from "ggaction/scene";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { exportAccessibleData } from "ggaction/accessibility";
import { comparePrograms, describeAction, getDatasetSchema, inspectProgram } from "ggaction/inspection";
import {createFacetSharedTopLaneProgram} from "./facet-lane-public.js";
import {createPlotUnderlayProgram} from "./plot-underlay-public.js";

export const cases = [
  { id: "authoring/create-canvas", async run() {
assert.equal(createTransitionScene(chart().createCanvas({width:100,height:100,margin:0})).version, 1);
  } },
  { id: "authoring/entry-surface", async run() {
assert.equal(basicChart().createAreaMark, undefined);
  } },
  { id: "authoring/entry-surface-2", async run() {
assert.equal(typeof basicChart().createTextPlot, "undefined");
  } },
  { id: "authoring/entry-surface-3", async run() {
assert.equal(basicChart().reviseData, undefined);
  } },
  { id: "authoring/entry-surface-4", async run() {
assert.equal(basicChart().applyTextMetrics, undefined);
  } },
  { id: "authoring/entry-surface-5", async run() {
assert.equal(basicChart().removeData, undefined);
  } },
  { id: "authoring/entry-surface-6", async run() {
assert.equal(basicChart().removeCoordinate, undefined);
  } },
  { id: "authoring/entry-surface-7", async run() {
assert.equal(typeof render, "function");
  } },
  { id: "authoring/entry-surface-8", async run() {
assert.equal(typeof basicChart().editCoordinate, "undefined");
  } },
  { id: "authoring/radar-wide", async run() {
const radarWide = chart()
      .createCanvas({ width: 240, height: 240, margin: 40 })
      .createData({ values: [{ speed: 2, quality: 4, cost: 3 }] })
      .createRadarPlot({
        id: "radarWide", wide: { fields: ["speed", "quality", "cost"] },
        guides: false
      });
assert.ok(radarWide.semanticSpec.datasets.some(dataset =>
      dataset.id === "radarWideFoldData"
    ));
assert.equal(
      radarWide.graphicSpec.objects.radarWide.items[0].properties.commands.at(-1).op,
      "Z"
    );
  } },
  { id: "authoring/entry-surface-9", async run() {
assert.equal(basicChart().createPolarScatterPlot, undefined);
  } },
  { id: "authoring/entry-surface-10", async run() {
assert.equal(basicChart().createPolarLinePlot, undefined);
  } },
  { id: "authoring/entry-surface-11", async run() {
assert.equal(basicChart().createRadarPlot, undefined);
  } },
  { id: "authoring/entry-surface-12", async run() {
assert.equal(basicChart().createRugPlot, undefined);
  } },
  { id: "authoring/entry-surface-13", async run() {
assert.equal(basicChart().createStripPlot, undefined);
  } },
  { id: "authoring/entry-surface-14", async run() {
assert.equal(basicChart().createBeeswarmPlot, undefined);
  } },
  { id: "authoring/entry-surface-15", async run() {
assert.equal(basicChart().createRaincloudPlot, undefined);
  } },
  { id: "authoring/entry-surface-16", async run() {
assert.equal(basicChart().editRaincloudPlot, undefined);
  } },
  { id: "authoring/entry-surface-17", async run() {
assert.equal(basicChart().packPoints, undefined);
  } },
  { id: "authoring/entry-surface-18", async run() {
assert.equal(basicChart().createECDFData, undefined);
  } },
  { id: "authoring/entry-surface-19", async run() {
assert.equal(basicChart().createECDFPlot, undefined);
  } },
  { id: "authoring/entry-surface-20", async run() {
assert.equal(basicChart().fitCanvas, undefined);
  } },
  { id: "authoring/binned", async run() {
const binned = chart()
      .createData({
        id: "samples",
        values: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
      })
      .createBin2DData({
        id: "sampleCells",
        x: "x",
        y: "y",
        bins: 2,
        extent: { x: [0, 1], y: [0, 1] },
        includeEmpty: true,
        as: { count: "count" }
      });
assert.equal(
      binned.semanticSpec.datasets.find(dataset => dataset.id === "sampleCells")
        .values.reduce((sum, row) => sum + row.count, 0),
      2
    );
const editedBinned = binned.editBin2DData({
      target: "sampleCells",
      bins: 1,
      includeEmpty: false
    });
assert.equal(
      editedBinned.materializationConfigs.data.bin2d.sampleCells.current,
      "sampleCellsBin2DDataRevision1"
    );
assert.equal(editedBinned.semanticSpec.datasets.at(-1).values.length, 1);
  } },
  { id: "authoring/create-canvas-2", async run() {
for (const factory of [chart, basicChart]) {
      const radius = factory().createCanvas().createData({ values: [{ x: 1, y: 2 }] })
        .createScatterPlot({ x: "x", y: "y", point: { radius: 4 }, guides: false });
      assert.equal(radius.graphicSpec.objects.scatterPlot.items[0].properties.radius, 4);
    }
  } },
  { id: "authoring/regression-opt-out", async run() {
const regressionOptOut = chart().createCanvas().createData({ values: [
      { x: 1, y: 2, group: "A" }, { x: 2, y: 5, group: "A" },
      { x: 3, y: 6, group: "B" }, { x: 4, y: 9, group: "B" }
    ] }).createScatterPlot({ x: "x", y: "y", color: "group", guides: false })
      .createRegression(JSON.parse(JSON.stringify({ groupBy: false, band: false })));
assert.equal(regressionOptOut.semanticSpec.datasets.at(-1).transform[0].groupBy, undefined);
  } },
  { id: "authoring/entry-surface-21", async run() {
assert.equal(typeof basicChart().createRegressionStatisticsData,"undefined");
  } },
  { id: "authoring/entry-surface-22", async run() {
assert.equal(typeof basicRender, "function");
  } },
  { id: "authoring/bar-facade", async run() {
const barFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { category: "A", value: 2 },
        { category: "B", value: 4 }
      ] })
      .createBarPlot({
        x: { field: "category", fieldType: "ordinal" },
        y: { field: "value", aggregate: "mean" },
        guides: false
      });
assert.equal(barFacade.graphicSpec.objects.barPlot.items.length, 2);
  } },
  { id: "authoring/histogram-facade", async run() {
const histogramFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ value: 1 }, { value: 2 }, { value: 3 }] })
      .createHistogram({ field: "value", guides: false });
assert.equal(histogramFacade.graphicSpec.objects.histogram.items.length, 3);
  } },
  { id: "authoring/heatmap-facade", async run() {
const heatmapFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { x: "A", y: "one", value: 1 },
        { x: "B", y: "one", value: 2 }
      ] })
      .createHeatmap({
        x: { field: "x", fieldType: "ordinal" },
        y: { field: "y", fieldType: "nominal" },
        color: { field: "value", fieldType: "quantitative" },
        guides: false
      });
assert.equal(heatmapFacade.graphicSpec.objects.heatmap.items.length, 2);
  } },
  { id: "authoring/violin-plot-facade", async run() {
const violinPlotFacade = chart()
      .createCanvas({ width: 180, height: 140, margin: 20 })
      .createData({ values: [
        { group: "A", value: 1 },
        { group: "A", value: 2 },
        { group: "B", value: 3 },
        { group: "B", value: 4 }
      ] })
      .createViolinPlot({
        x: { field: "group", fieldType: "nominal" },
        y: { field: "value", fieldType: "quantitative" },
        density: { bandwidth: 0.5, steps: 8 },
        guides: false
      });
assert.equal(violinPlotFacade.graphicSpec.objects.violinPlot.items.length, 2);
assert.equal(
      violinPlotFacade.trace.children.at(-1).op,
      "createViolinPlot"
    );
  } },
  { id: "authoring/create-canvas-3", async run() {
assert.equal(chart().createCanvas().createData({ values: [] })
      .createAnnotation({ text: "Plot", space: "plot", x: 0.5, y: 0.5 })
      .graphicSpec.objects.annotation.items.length, 1);
  } },
  { id: "authoring/reference-facades", async run() {
const referenceFacades = chart().createCanvas({ width: 480, height: 320, margin: 40 })
      .createData({ values: [] }).createReferenceBand({ space: "plot", x: [0.2, 0.6] })
      .createReferenceLine({ space: "plot", y: 0.5 });
assert.equal(referenceFacades.graphicSpec.objects.referenceBand.items[0].properties.width, 160);
assert.equal(referenceFacades.graphicSpec.objects.referenceLine.items[0].properties.y1, 160);
assert.equal(referenceFacades.semanticSpec.datasets.length, 1);
assert.equal(referenceFacades.semanticSpec.datasets[0].values.length, 0);
  } }
];
