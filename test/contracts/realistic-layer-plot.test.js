import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getPlotComposition } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";

const numeric = { x: "orderNumeric", y: "value" };
const grouped = { x: { field: "category", fieldType: "nominal" }, y: { field: "value", fieldType: "quantitative" } };
const cases = [
  ...["createScatterPlot", "createLinePlot", "createAreaPlot"].map(action => [action, numeric]),
  ["createRegressionPlot", { ...numeric, band: false }],
  ["createHeatmap", { ...numeric, bin: { bins: 4 } }],
  ["createTextPlot", { ...numeric, text: "category" }],
  ["createHorizonPlot", { x: "sourceRowIndex", y: { field: "value", fieldType: "quantitative" } }],
  ["createRugPlot", { x: "value", edge: "bottom" }],
  ...["createDensityPlot", "createECDFPlot", "createHistogram"].map(action => [action, { field: "value" }]),
  ...["createBoxPlot", "createViolinPlot", "createGradientPlot", "createStripPlot", "createBeeswarmPlot"].map(action => [action, grouped]),
  ["createIntervalPlot", { x: "category", y: { field: "value", center: "mean", extent: "ci" } }],
  ["createRaincloudPlot", { category: "category", value: "value" }],
  ["createBarPlot", { x: "category", y: { field: "value", aggregate: "mean" } }],
  ...["createDotPlot", "createLollipopPlot"].map(action => [action, { category: "category", value: "value", summary: "mean" }]),
  ["createDumbbellPlot", { category: "category", start: "value", end: "orderNumeric", summary: "mean" }],
  ...["createPiePlot", "createRosePlot", "createRadialBarPlot"].map(action => [action, { category: "category", aggregate: "count" }]),
  ...["createPolarScatterPlot", "createPolarLinePlot"].map(action => [action, { theta: "orderNumeric", radius: "value" }]),
  ["createParallelCoordinates", { dimensions: ["orderNumeric", "value"] }]
];

for (const dataset of ["tt-tour-de-france-winners", "tt-london-marathon-winners", "tt-penguins"]) {
  test(`independent native layer constructors preserve original rows and owners on ${dataset}`, () => {
    const view = realisticRecordView(dataset, { rowLimit: 24 });
    const base = chart().createCanvas({ plot: { width: 1200, height: 900 }, margin: 200 })
      .createData({ id: "rows", values: view.rows });
    for (const [action, options] of cases) {
      const source = base[action]({ id: "source", ...options, guides: false });
      const before = serializeProgram(source);
      for (let index = 0; index < 5; index++) {
        const result = source.createLayerPlot({ id: "layer", source: "source", placement: index % 2 ? "front" : "back",
          plot: { action, inherit: { color: index % 2 === 0 }, options: { guides: false, ...(action === "createDumbbellPlot" ? { start: "value", end: "orderNumeric" } : {}) } } });
        const owner = getPlotComposition(result, { target: "layer" });
        assert.equal(owner.data, "rows", action);
        assert.ok(owner.ownedMarks.length > 0, action);
        assert.deepEqual(result.semanticSpec.datasets.find(d => d.id === "rows").values, view.rows, action);
        assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec, action);
        assert.equal(serializeProgram(source), before, action);
        assert.equal(result.trace.children.at(-1).op, "createLayerPlot");
      }
    }
  });
}
