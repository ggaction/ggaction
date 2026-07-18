import assert from "node:assert/strict";
import test from "node:test";

import { PUBLIC_CHARTS } from "../../examples/registry.js";
import {
  findGraphicParent,
  walkGraphicDrawOrder
} from "../../src/grammar/schemas/graphicTree.js";
import {
  loadCars,
  loadGapminder,
  loadImdbSelected,
  loadJobs,
  loadNightingaleRose
} from "../support/data.js";

const LOADERS = Object.freeze({
  cars: loadCars,
  gapminder: loadGapminder,
  jobs: loadJobs,
  nightingaleRose: loadNightingaleRose,
  imdbSelected: loadImdbSelected
});

const EXPECTED_DRAW_ORDER = Object.freeze({
  "cars-scatterplot": [
    "canvas", "horizontalGridLines", "points",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle"
  ],
  "annotated-imdb-scatterplot": [
    "canvas", "horizontalGridLines", "point", "text",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "chartTitle"
  ],
  "cars-line-chart": [
    "canvas", "horizontalGridLines", "trends",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "seriesLegendSymbols", "seriesLegendLabels", "seriesLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "cars-polar-scatterplot": [
    "canvas", "point"
  ],
  "cars-polar-guides": [
    "canvas", "radialGridCircles", "thetaGridLines", "point",
    "thetaAxisLine", "thetaAxisTicks", "thetaAxisLabels", "thetaAxisTitle",
    "radialAxisLine", "radialAxisTicks", "radialAxisLabels", "radialAxisTitle"
  ],
  "gapminder-polar-trends": [
    "canvas", "radialGridCircles", "thetaGridLines", "line",
    "thetaAxisLine", "thetaAxisTicks", "thetaAxisLabels", "thetaAxisTitle",
    "radialAxisLine", "radialAxisTicks", "radialAxisLabels", "radialAxisTitle",
    "seriesLegendSymbols", "seriesLegendLabels", "seriesLegendTitle"
  ],
  "jobs-radar-chart": [
    "canvas", "radialGridCircles", "thetaGridLines", "line",
    "thetaAxisLine", "thetaAxisTicks", "thetaAxisLabels", "thetaAxisTitle",
    "radialAxisLine", "radialAxisTicks", "radialAxisLabels", "radialAxisTitle",
    "seriesLegendSymbols", "seriesLegendLabels", "seriesLegendTitle"
  ],
  "cars-origin-donut": [
    "canvas", "arc",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"
  ],
  "nightingale-rose-chart": [
    "canvas", "radialGridCircles", "arc",
    "thetaAxisLine", "thetaAxisTicks", "thetaAxisLabels",
    "radialAxisLine", "radialAxisTicks", "radialAxisLabels",
    "radialAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"
  ],
  "gapminder-radial-bars": [
    "canvas", "radialGridCircles", "arc",
    "thetaAxisLine", "thetaAxisTicks", "thetaAxisLabels", "thetaAxisTitle",
    "radialAxisLine", "radialAxisTicks", "radialAxisLabels",
    "radialAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"
  ],
  "cars-histogram": [
    "canvas", "horizontalGridLines", "bars",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "jobs-grouped-bar": [
    "canvas", "horizontalGridLines", "bars",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"
  ],
  "jobs-horizontal-grouped-bar": [
    "canvas", "verticalGridLines", "bar",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "cars-regression-scatterplot": [
    "canvas", "horizontalGridLines", "pointsRegressionBands", "points",
    "pointsRegressionLines", "xAxisLine", "xAxisTicks", "xAxisLabels",
    "xAxisTitle", "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "seriesLegendSymbolLines", "seriesLegendSymbolPoints",
    "seriesLegendLabels", "seriesLegendTitle", "sizeLegendSymbols",
    "sizeLegendLabels", "sizeLegendTitle"
  ],
  "cars-density-area": [
    "canvas", "horizontalGridLines", "verticalGridLines", "densities",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "cars-error-bar": [
    "canvas", "horizontalGridLines", "point", "errorBar",
    "errorBarLowerCap", "errorBarUpperCap",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "chartTitle", "chartSubtitle"
  ],
  "cars-box-plot": [
    "canvas", "horizontalGridLines", "boxPlotWhisker",
    "boxPlotWhiskerLowerCap", "boxPlotWhiskerUpperCap", "boxPlot",
    "boxPlotMedian", "boxPlotOutliers",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "chartTitle", "chartSubtitle"
  ],
  "gapminder-error-band": [
    "canvas", "horizontalGridLines", "errorBand", "errorBandLowerBoundary",
    "errorBandUpperBoundary", "xAxisLine", "xAxisTicks", "xAxisLabels",
    "xAxisTitle", "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "gapminder-continuous-color-bars": [
    "canvas", "horizontalGridLines", "bar",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorGradientStrips", "colorGradientTicks", "colorGradientLabels",
    "colorGradientTitle",
    "chartTitle", "chartSubtitle"
  ],
  "gapminder-discretized-color-scales": [
    "canvas", "horizontalGridLines", "verticalGridLines", "point",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "gapminder-temporal-discrete-scales": [
    "canvas", "horizontalGridLines", "bar", "point",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "chartTitle", "chartSubtitle"
  ],
  "gapminder-transformed-scales": [
    "canvas", "horizontalGridLines", "verticalGridLines", "point",
    "xAxisLine", "xAxisTicks", "xAxisLabels",
    "xAxisTitle", "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorGradientStrips", "colorGradientTicks", "colorGradientLabels",
    "colorGradientTitle",
    "chartTitle", "chartSubtitle"
  ],
  "mark-selection-points": [
    "canvas", "horizontalGridLines", "points",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "mark-selection-bars": [
    "canvas", "horizontalGridLines", "bars",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "mark-selection-lines": [
    "canvas", "horizontalGridLines", "trends",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "seriesLegendSymbols", "seriesLegendLabels", "seriesLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "program-composition": [],
  "cars-origin-scatterplot-facet": []
});

function isCanvasOwned(id) {
  return id.includes("Legend") || id.includes("Gradient") ||
    id === "chartTitle" || id === "chartSubtitle";
}

test("locks the complete public graphic hierarchy inventory", () => {
  assert.deepEqual(
    Object.keys(EXPECTED_DRAW_ORDER).sort(),
    PUBLIC_CHARTS.map(chart => chart.id).sort()
  );

  for (const chart of PUBLIC_CHARTS) {
    const program = chart.createProgram(LOADERS[chart.data]());
    const drawOrder = [];
    walkGraphicDrawOrder(program.graphicSpec, ({ id }) => drawOrder.push(id));
    const expected = EXPECTED_DRAW_ORDER[chart.id];
    if (chart.id === "program-composition") {
      assert.deepEqual(program.graphicSpec.order, ["canvas"]);
      assert.equal(program.graphicSpec.objects.canvas.children.length, 2);
      for (const childId of program.graphicSpec.objects.canvas.children) {
        assert.equal(program.graphicSpec.objects[childId].type, "canvas");
        assert.equal(findGraphicParent(program.graphicSpec, childId).id, "canvas");
      }
      assert.equal(drawOrder[0], "canvas");
      assert.equal(drawOrder.length, 7);
      continue;
    }
    if (program.compositionSpec?.type === "facet") {
      assert.deepEqual(program.graphicSpec.order, ["canvas"]);
      const rootChildren = program.graphicSpec.objects.canvas.children;
      assert.equal(rootChildren.length, 7);
      assert.equal(rootChildren.slice(0, 3).every(id =>
        program.graphicSpec.objects[id].type === "canvas"
      ), true);
      assert.deepEqual(rootChildren.slice(3), [
        "facet-headers", "facet-legend", "chartTitle", "chartSubtitle"
      ]);
      for (const childId of rootChildren) {
        assert.equal(findGraphicParent(program.graphicSpec, childId).id, "canvas");
      }
      assert.equal(drawOrder[0], "canvas");
      assert.ok(drawOrder.length > 20);
      continue;
    }
    const descendants = expected.slice(1);
    const canvasChildren = [
      "plot-main",
      ...descendants.filter(isCanvasOwned)
    ];
    const plotChildren = descendants.filter(id => !isCanvasOwned(id));

    assert.deepEqual(program.graphicSpec.order, ["canvas"]);
    assert.deepEqual(program.graphicSpec.objects.canvas.children, canvasChildren);
    assert.deepEqual(program.graphicSpec.objects["plot-main"].children, plotChildren);
    assert.deepEqual(drawOrder, ["canvas", "plot-main", ...descendants]);
    assert.equal(program.graphicSpec.objects.canvas.type, "canvas");
    assert.equal(findGraphicParent(program.graphicSpec, "canvas"), undefined);
    assert.equal(findGraphicParent(program.graphicSpec, "plot-main").id, "canvas");
    for (const id of plotChildren) {
      assert.equal(findGraphicParent(program.graphicSpec, id).id, "plot-main");
    }
    for (const id of canvasChildren.slice(1)) {
      assert.equal(findGraphicParent(program.graphicSpec, id).id, "canvas");
    }
  }
});
