import assert from "node:assert/strict";
import test from "node:test";

import { PUBLIC_CHARTS } from "../../examples/registry.js";
import {
  findGraphicParent,
  walkGraphicDrawOrder
} from "../../src/grammar/schemas/graphicTree.js";
import {
  loadCars,
  loadFashionTsne,
  loadGapminder,
  loadImdbSelected,
  loadJobs,
  loadNightingaleRose
} from "../support/data.js";

const LOADERS = Object.freeze({
  cars: loadCars,
  fashionTsne: loadFashionTsne,
  gapminder: loadGapminder,
  jobs: loadJobs,
  nightingaleRose: loadNightingaleRose,
  imdbSelected: loadImdbSelected
});

const EXPECTED_DRAW_ORDER = Object.freeze({
  "facet-grid": [],
  "repeat-charts": [],
  "beeswarm-plot": [
    "canvas", "horizontalGridLines", "swarm",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle"
  ],
  "raincloud-plot": [
    "canvas", "horizontalGridLines", "distributionCloud",
    "distributionSummaryWhisker", "distributionSummaryWhiskerLowerCap",
    "distributionSummaryWhiskerUpperCap", "distributionSummary",
    "distributionSummaryMedian", "distributionPoints",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle"
  ],
  "dot-plot": ["canvas", "dot"],
  "lollipop-plot": ["canvas", "lollipopStem", "lollipop"],
  "dumbbell-plot": ["canvas", "dumbbellConnector", "dumbbellStart", "dumbbell"],
  "ecdf-plot": ["canvas", "ecdf", "ecdfLabel"],
  "color-transitions": ["canvas","horizontalGridLines","m","xAxisLine","xAxisTicks","xAxisLabels","xAxisTitle","yAxisLine","yAxisTicks","yAxisLabels","yAxisTitle","colorLegendSymbols","colorLegendLabels","colorLegendTitle"],
  "color-midpoint": ["canvas","horizontalGridLines","m","xAxisLine","xAxisTicks","xAxisLabels","xAxisTitle","yAxisLine","yAxisTicks","yAxisLabels","yAxisTitle","colorGradientStrips","colorGradientTicks","colorGradientLabels","colorGradientTitle"],
  "radial-sectors": ["canvas", "radialGridCircles", "thetaGridLines", "sectors", "thetaAxisLine", "thetaAxisTicks", "thetaAxisLabels", "thetaAxisTitle", "radialAxisLine", "radialAxisTicks", "radialAxisLabels", "radialAxisTitle", "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"],
  "theta-legend-order": ["canvas", "pie", "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"],
  "area-layout": ["canvas", "horizontalGridLines", "m", "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle"],
  "horizon-plot": ["canvas", "verticalGridLines", "horizon",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle"],
  "density-plot": ["canvas", "horizontalGridLines", "density",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle"],
  "pie-plot": ["canvas", "pie", "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"],
  "temporal-input": [
    "canvas", "horizontalGridLines", "events",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "chartTitle", "chartSubtitle"
  ],
  "series-identity": [
    "canvas", "horizontalGridLines", "series",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "seriesLegendSymbols", "seriesLegendLabels", "seriesLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "cars-acceleration-violins": [
    "canvas", "horizontalGridLines", "violins",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "chartTitle", "chartSubtitle"
  ],
  "cars-binned-heatmap": [
    "canvas", "heatmap",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorGradientStrips", "colorGradientTicks", "colorGradientLabels",
    "colorGradientTitle", "chartTitle", "chartSubtitle"
  ],
  "cars-window-rank-scatterplot": [
    "canvas", "horizontalGridLines", "rankedCarsPlot",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbolPoints", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "cars-origin-jitter": [
    "canvas", "horizontalGridLines", "observations",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle"
  ],
  "gapminder-cluster-jitter": [
    "canvas", "verticalGridLines", "observations",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle"
  ],
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
  "dark-theme-scatterplot": [
    "canvas", "horizontalGridLines", "point",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "fitted-long-labels": [
    "canvas", "scatterPlot",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "chartTitle", "chartSubtitle"
  ],
  "gapminder-life-expectancy-heatmap": [
    "canvas", "rect", "text",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorGradientStrips", "colorGradientTicks", "colorGradientLabels",
    "colorGradientTitle", "chartTitle"
  ],
  "cars-line-chart": [
    "canvas", "horizontalGridLines", "trends",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "seriesLegendSymbols", "seriesLegendLabels", "seriesLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "cars-multi-legend-layout": [
    "canvas", "horizontalGridLines", "points",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "opacityLegendSymbols", "opacityLegendLabels", "opacityLegendTitle"
  ],
  "gapminder-development-trajectories": [
    "canvas", "horizontalGridLines", "verticalGridLines",
    "trajectories",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "seriesLegendSymbols", "seriesLegendLabels", "seriesLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "gapminder-country-labels": [
    "canvas", "horizontalGridLines", "verticalGridLines",
    "countryLabels-label-leaders", "countries", "countryLabels",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "chartTitle", "chartSubtitle"
  ],
  "cars-temporal-bar-line": [
    "canvas", "horizontalGridLines", "bars", "trend",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
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
  "cars-parallel-coordinates": [
    "canvas", "parallelCoordinates",
    "parallelAxisLines", "parallelAxisTicks", "parallelAxisLabels",
    "parallelAxisTitles", "seriesLegendSymbols", "seriesLegendLabels",
    "seriesLegendTitle", "chartTitle", "chartSubtitle"
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
  "gapminder-population-donut": [
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
  "centered-area-stream": [
    "canvas", "horizontalGridLines", "occupations",
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
  "cars-gradient-plot": [
    "canvas", "horizontalGridLines", "gradientPlot", "gradientPlotCenter",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
    "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "gradientPlotDensityLegend", "gradientPlotDensityLegendLabels",
    "gradientPlotDensityLegendTitle", "chartTitle", "chartSubtitle"
  ],
  "gapminder-error-band": [
    "canvas", "horizontalGridLines", "errorBand", "errorBandLowerBoundary",
    "errorBandUpperBoundary", "xAxisLine", "xAxisTicks", "xAxisLabels",
    "xAxisTitle", "yAxisLine", "yAxisTicks", "yAxisLabels", "yAxisTitle",
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle",
    "chartTitle", "chartSubtitle"
  ],
  "gapminder-horizon": [
    "canvas", "verticalGridLines", "area",
    "xAxisLine", "xAxisTicks", "xAxisLabels", "xAxisTitle",
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
  "directional-tick-plot": [],
  "ordered-category-bar": [],
  "time-unit-data": [],
  "airline-passenger-moving-windows": [],
  "cars-origin-scatterplot-facet": [],
  "cross-feature-dashboard": []
});

const EXPECTED_COMPOSITION_DRAW_LENGTH = Object.freeze({
  "program-composition": 9,
  "directional-tick-plot": 28,
  "ordered-category-bar": 43,
  "cross-feature-dashboard": 52,
  "time-unit-data": 29,
  "airline-passenger-moving-windows": 45
});

const EXPECTED_COMPOSITION_CHILDREN = Object.freeze({
  "program-composition": 2,
  "directional-tick-plot": 3,
  "cross-feature-dashboard": 2,
  "time-unit-data": 2,
  "airline-passenger-moving-windows": 3,
  "ordered-category-bar": 3
});

function loadChartData(data) {
  if (typeof data === "string") return LOADERS[data]();
  return Object.fromEntries(Object.entries(data).map(([key, dataset]) => [
    key,
    LOADERS[dataset]()
  ]));
}

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
    const program = chart.createProgram(loadChartData(chart.data));
    const drawOrder = [];
    walkGraphicDrawOrder(program.graphicSpec, ({ id }) => drawOrder.push(id));
    const expected = EXPECTED_DRAW_ORDER[chart.id];
    if (program.compositionSpec?.direction) {
      assert.deepEqual(program.graphicSpec.order, ["canvas"]);
      assert.equal(
        program.graphicSpec.objects.canvas.children.length,
        EXPECTED_COMPOSITION_CHILDREN[chart.id]
      );
      for (const childId of program.graphicSpec.objects.canvas.children) {
        assert.equal(program.graphicSpec.objects[childId].type, "canvas");
        assert.equal(findGraphicParent(program.graphicSpec, childId).id, "canvas");
      }
      assert.equal(drawOrder[0], "canvas");
      assert.equal(drawOrder.length, EXPECTED_COMPOSITION_DRAW_LENGTH[chart.id]);
      continue;
    }
    if (program.compositionSpec?.type === "facet") {
      assert.deepEqual(program.graphicSpec.order, ["canvas"]);
      const rootChildren = program.graphicSpec.objects.canvas.children;
      const childCount = program.compositionSpec.children.length;
      assert.equal(rootChildren.slice(0, childCount).every(id =>
        program.graphicSpec.objects[id].type === "canvas"
      ), true);
      const expectedParentChildren = chart.id === "facet-grid"
        ? ["matrix-headers"]
        : chart.id === "repeat-charts"
          ? ["metrics-headers", "metrics-shared-legend"]
          : ["facet-headers", "facet-legend", "chartTitle", "chartSubtitle"];
      assert.deepEqual(rootChildren.slice(childCount), expectedParentChildren);
      for (const childId of rootChildren) {
        assert.equal(findGraphicParent(program.graphicSpec, childId).id, "canvas");
      }
      assert.equal(drawOrder[0], "canvas");
      const expectedDrawLength = chart.id === "facet-grid"
        ? 19
        : chart.id === "repeat-charts"
          ? 15
          : undefined;
      if (expectedDrawLength === undefined) assert.ok(drawOrder.length > 20);
      else assert.equal(drawOrder.length, expectedDrawLength);
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
