import { chart, hconcat } from "../../src/index.js";

import { createCarsAccelerationViolins } from "../../examples/cars-acceleration-violins/program.js";
import { createCarsBinnedHeatmap } from "../../examples/cars-binned-heatmap/program.js";
import { createCarsBoxPlot } from "../../examples/cars-box-plot/program.js";
import { createCarsDensityArea } from "../../examples/cars-density-area/program.js";
import { createCarsErrorBar } from "../../examples/cars-error-bar/program.js";
import { createCarsMultiLegendLayout } from "../../examples/cars-multi-legend-layout/program.js";
import { createCarsParallelCoordinates } from "../../examples/cars-parallel-coordinates/program.js";
import { createGapminderCurvedBoundaryErrorBand } from "../../examples/gapminder-error-band/program.js";
import { createGapminderHorizon } from "../../examples/gapminder-horizon/program.js";
import { createNightingaleRoseChart } from "../../examples/nightingale-rose-chart/program.js";

const ROOT_RUNTIME = Object.freeze(["chart", "render"]);

function completeCars(cars, fields) {
  return cars.filter(row => fields.every(field => {
    const value = row[field];
    return typeof value === "string" ? value.length > 0 : Number.isFinite(value);
  }));
}

function completeRows(rows, fields) {
  return rows.filter(row => fields.every(field => row[field] !== null && row[field] !== undefined));
}

function regressionRSquared(rows, x, y) {
  const xMean = rows.reduce((sum, row) => sum + row[x], 0) / rows.length;
  const yMean = rows.reduce((sum, row) => sum + row[y], 0) / rows.length;
  const xVariance = rows.reduce((sum, row) => sum + ((row[x] - xMean) ** 2), 0);
  const covariance = rows.reduce((sum, row) => sum + ((row[x] - xMean) * (row[y] - yMean)), 0);
  const slope = covariance / xVariance;
  const intercept = yMean - (slope * xMean);
  const total = rows.reduce((sum, row) => sum + ((row[y] - yMean) ** 2), 0);
  const residual = rows.reduce((sum, row) => sum + ((row[y] - (intercept + slope * row[x])) ** 2), 0);
  return 1 - (residual / total);
}

function carsScatterOrigin({ cars }) {
  return chart()
    .createCanvas({ width: 700, height: 460, margin: { top: 54, right: 150, bottom: 70, left: 76 } })
    .createData({ id: "cars", values: completeCars(cars, ["Horsepower", "Miles_per_Gallon", "Origin"]) })
    .createScatterPlot({
      id: "points",
      x: { field: "Horsepower", fieldType: "quantitative" },
      y: { field: "Miles_per_Gallon", fieldType: "quantitative" },
      color: { field: "Origin", fieldType: "nominal", scale: { palette: "tableau10" } },
      guides: { axes: { x: {}, y: {} }, legend: {} }
    });
}

function carsRegressionJapan({ cars }) {
  const rows = completeCars(cars, ["Horsepower", "Miles_per_Gallon", "Origin"]);
  const japan = rows.filter(row => row.Origin === "Japan");
  const labelRow = japan[Math.floor(japan.length * 0.7)];
  const label = `R² = ${regressionRSquared(japan, "Horsepower", "Miles_per_Gallon").toFixed(2)}`;
  return chart()
    .createCanvas({ width: 720, height: 470, margin: { top: 54, right: 36, bottom: 70, left: 76 } })
    .createData({ id: "cars", values: rows })
    .createScatterPlot({
      id: "points",
      data: "cars",
      x: { field: "Horsepower", fieldType: "quantitative", scale: { id: "x", nice: true, zero: false } },
      y: { field: "Miles_per_Gallon", fieldType: "quantitative", scale: { id: "y", nice: true, zero: false } },
      point: { fill: "#f59e0b", opacity: 0.25 },
      guides: { axes: { x: {}, y: {} }, legend: false }
    })
    .selectMarks({ id: "japanSelection", target: "points", field: "Origin", op: "eq", value: "Japan" })
    .highlightMarks({
      target: "points",
      selection: "japanSelection",
      fill: "#c65d00",
      stroke: "#c65d00",
      strokeWidth: 0,
      opacity: 1,
      dimOthers: { opacity: 0.12 },
      bringToFront: true
    })
    .filterData({ id: "japan", source: "cars", field: "Origin", oneOf: ["Japan"] })
    .createPointMark({ id: "japanPoints", data: "japan", fill: "#000000", opacity: 0 })
    .encodeX({ target: "japanPoints", field: "Horsepower", scale: { id: "x" } })
    .encodeY({ target: "japanPoints", field: "Miles_per_Gallon", scale: { id: "y" } })
    .createRegression({ target: "japanPoints", groupBy: undefined, band: false, line: { strokeWidth: 3 } })
    .highlightMarks({
      target: "japanPointsRegressionLines",
      select: { property: "stroke", op: "eq", value: "#4c78a8" },
      stroke: "#000000",
      strokeWidth: 3
    })
    .createData({ id: "fitLabel", values: [{
      Horsepower: labelRow.Horsepower,
      Miles_per_Gallon: labelRow.Miles_per_Gallon,
      label
    }] })
    .createTextMark({ id: "fitText", data: "fitLabel", fill: "#000000", fontSize: 13, fontWeight: 700, dx: 10, dy: -10 })
    .encodeX({ target: "fitText", field: "Horsepower", scale: { id: "x" } })
    .encodeY({ target: "fitText", field: "Miles_per_Gallon", scale: { id: "y" } })
    .encodeText({ target: "fitText", field: "label" });
}

function carsHistogramOrigin({ cars }) {
  return chart()
    .createCanvas({ width: 720, height: 470, margin: { top: 92, right: 150, bottom: 70, left: 76 } })
    .createData({ id: "cars", values: completeCars(cars, ["Horsepower", "Origin"]) })
    .createHistogram({
      id: "histogram",
      field: "Horsepower",
      maxBins: 12,
      color: { field: "Origin", fieldType: "nominal", layout: "stack", scale: { palette: "tableau10" } },
      guides: { axes: { x: {}, y: {} }, legend: {} }
    })
    .createTitle({ text: "Horsepower Distribution by Origin" });
}

function carsTemporalLineOrigin({ cars }) {
  return chart()
    .createCanvas({ width: 720, height: 460, margin: { top: 62, right: 150, bottom: 70, left: 76 } })
    .createData({ id: "cars", values: completeCars(cars, ["Year", "Miles_per_Gallon", "Origin"]) })
    .createLinePlot({
      id: "trends",
      x: { field: "Year", fieldType: "temporal" },
      y: { field: "Miles_per_Gallon", aggregate: "mean", scale: { zero: false } },
      groupBy: "Origin",
      color: { field: "Origin", fieldType: "nominal", scale: { palette: "tableau10" } },
      line: { curve: "monotone", strokeWidth: 2.5 },
      guides: { axes: { x: {}, y: {} }, legend: {} }
    });
}

function jobsGroupedBar({ jobs }) {
  const rows = completeRows(jobs, ["job", "sex", "year", "perc"]);
  const year = Math.max(...rows.map(row => row.year));
  const totals = new Map();
  for (const row of rows.filter(candidate => candidate.year === year)) {
    totals.set(row.job, (totals.get(row.job) ?? 0) + row.perc);
  }
  const topJobs = new Set([...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([job]) => job));
  return chart()
    .createCanvas({ width: 900, height: 520, margin: { top: 92, right: 150, bottom: 190, left: 76 } })
    .createData({ id: "jobs", values: rows.filter(row => topJobs.has(row.job)) })
    .filterData({ id: "jobsYear", source: "jobs", field: "year", oneOf: [year] })
    .createBarPlot({
      id: "bars",
      data: "jobsYear",
      x: { field: "job", fieldType: "nominal" },
      y: { field: "perc", fieldType: "quantitative" },
      color: { field: "sex", fieldType: "nominal", layout: "group", scale: { palette: "tableau10" } },
      width: { band: 0.76 },
      guides: { axes: { x: {}, y: {} }, legend: {} }
    })
    .orderCategories({
      target: "bars",
      channel: "x",
      by: { field: "perc", aggregate: "sum" },
      direction: "descending"
    })
    .createTitle({ text: `Top Occupations by Gender in ${year}` });
}

function carsErrorBand({ gapminder }) {
  return createGapminderCurvedBoundaryErrorBand(gapminder);
}

function carsFacetOrigin({ cars }) {
  return chart()
    .createCanvas({ width: 320, height: 260, margin: { top: 48, right: 20, bottom: 62, left: 64 } })
    .createData({ id: "cars", values: completeCars(cars, ["Origin", "Horsepower", "Miles_per_Gallon"]) })
    .createScatterPlot({
      id: "points",
      x: { field: "Horsepower", fieldType: "quantitative", scale: { nice: true, zero: false } },
      y: { field: "Miles_per_Gallon", fieldType: "quantitative", scale: { nice: true, zero: false } },
      point: { fill: "#2563eb", opacity: 0.65 },
      guides: { axes: { x: {}, y: {} }, legend: false }
    })
    .facet({ field: "Origin", columns: 2, gap: 24, scales: { x: "shared", y: "shared" }, guides: { axes: "outer" } })
    .editFacetHeaders({ fontSize: 14, fontWeight: 700, offset: 10 });
}

function carsSelectionHighlight({ cars }) {
  return chart()
    .createCanvas({ width: 700, height: 450, margin: { top: 50, right: 36, bottom: 68, left: 74 } })
    .createData({ id: "cars", values: completeCars(cars, ["Horsepower", "Miles_per_Gallon", "Origin"]) })
    .createScatterPlot({
      id: "points",
      x: "Horsepower",
      y: "Miles_per_Gallon",
      point: { fill: "#f59e0b", opacity: 0.45 },
      guides: { axes: { x: {}, y: {} }, legend: false }
    })
    .selectMarks({ id: "japan", target: "points", field: "Origin", op: "eq", value: "Japan" })
    .highlightMarks({
      target: "points",
      selection: "japan",
      fill: "#c65d00",
      stroke: "#c65d00",
      strokeWidth: 0,
      opacity: 1,
      dimOthers: { opacity: 0.1 },
      bringToFront: true
    });
}

function gapminderMovingWindow({ gapminder }) {
  let program = chart()
    .createCanvas({ width: 760, height: 450, margin: { top: 58, right: 150, bottom: 68, left: 76 } })
    .createData({ id: "gapminder", values: completeRows(gapminder, ["country", "year", "life_expect"]).map(row => ({ ...row, series: "Original" })) })
    .filterData({ id: "kenya", source: "gapminder", field: "country", oneOf: ["Kenya"] })
    .createWindowData({
      id: "kenyaMoving",
      source: "kenya",
      sortBy: [{ field: "year" }],
      operations: [{ op: "movingMean", field: "life_expect", as: "movingLifeExpect", frame: { preceding: 1, following: 1 } }]
    });
  const movingRows = program.semanticSpec.datasets.find(dataset => dataset.id === "kenyaMoving").values
    .map(row => ({ ...row, series: "Centered 3-row mean" }));
  program = program
    .createData({ id: "kenyaMovingSeries", values: movingRows })
    .createLineMark({ id: "original", data: "kenya", strokeWidth: 2 })
    .encodeX({ target: "original", field: "year", fieldType: "temporal", scale: { id: "x" } })
    .encodeY({ target: "original", field: "life_expect", fieldType: "quantitative", aggregate: "mean", scale: { id: "y", zero: false } })
    .encodeColor({ target: "original", field: "series", fieldType: "nominal", scale: { id: "seriesColor", domain: ["Original", "Centered 3-row mean"], range: ["#94a3b8", "#2563eb"] } })
    .createLineMark({ id: "moving", data: "kenyaMovingSeries", strokeWidth: 3 })
    .encodeX({ target: "moving", field: "year", fieldType: "temporal", scale: { id: "x" } })
    .encodeY({ target: "moving", field: "movingLifeExpect", fieldType: "quantitative", aggregate: "mean", scale: { id: "y", zero: false } })
    .encodeColor({ target: "moving", field: "series", fieldType: "nominal", scale: { id: "seriesColor" } })
    .createLegend({ target: "moving", channels: ["color"], position: "right" })
    .createGuides({
      axes: {
        x: { title: { text: "Year" } },
        y: { title: { text: "Life expectancy" } }
      },
      legend: false
    });
  return program;
}

function carsTimeUnit({ cars }) {
  return chart()
    .createCanvas({ width: 720, height: 460, margin: { top: 56, right: 150, bottom: 68, left: 76 } })
    .createData({ id: "cars", values: completeCars(cars, ["Year", "Miles_per_Gallon", "Origin"]) })
    .createTimeUnitData({ id: "carsByYear", source: "cars", field: "Year", unit: "year", as: "year" })
    .createLinePlot({
      id: "trends",
      data: "carsByYear",
      x: { field: "year", fieldType: "temporal" },
      y: { field: "Miles_per_Gallon", aggregate: "mean", scale: { zero: false } },
      groupBy: "Origin",
      color: { field: "Origin", fieldType: "nominal", scale: { palette: "tableau10" } },
      line: { curve: "monotone" },
      guides: { axes: { x: {}, y: {} }, legend: {} }
    });
}

function carsRugDistribution({ cars }) {
  const rows = completeCars(cars, ["Horsepower"]).map(row => ({ ...row, Baseline: 0 }));
  return chart()
    .createCanvas({ width: 760, height: 250, margin: { top: 54, right: 34, bottom: 72, left: 60 } })
    .createData({ id: "cars", values: rows })
    .createTickMark({ id: "ticks", length: 22, stroke: "#2563eb", strokeWidth: 1.4, opacity: 0.28 })
    .encodeX({ target: "ticks", field: "Horsepower", fieldType: "quantitative" })
    .encodeY({ target: "ticks", field: "Baseline", fieldType: "quantitative", scale: { domain: [-1, 1], range: [118, 118] } })
    .createXAxis({ title: { text: "Horsepower" } });
}

function carsGradientProfile({ cars }) {
  const rows = completeCars(cars, ["Origin", "Acceleration", "Horsepower"]);
  return chart()
    .createCanvas({ width: 620, height: 560, margin: { top: 92, right: 170, bottom: 190, left: 80 } })
    .createData({ id: "data", values: rows })
    .createGradientPlot({
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Acceleration", fieldType: "quantitative" },
      density: { bandwidth: "auto", steps: 64 },
      width: { band: 0.7 },
      gradient: { opacity: [0, 1] },
      center: { type: "median" },
      guides: {
        axes: {
          x: { title: { text: "Origin" } },
          y: { title: { text: "Acceleration" } }
        },
        legend: { title: "Relative density", position: "right" }
      }
    })
    .encodeColor({ target: "gradientPlot", field: "Origin", fieldType: "nominal", scale: { palette: "tableau10" } })
    .createTitle({
      text: "Acceleration Distribution by Origin",
      subtitle: "Gradient intensity shows density; points show horsepower",
      align: "center"
    })
    .createPointMark({ id: "horsepowerColor", data: "data", opacity: 0.5, stroke: "#ffffff", strokeWidth: 0.4 })
    .encodeX({ target: "horsepowerColor", field: "Origin", fieldType: "nominal" })
    .encodeY({ target: "horsepowerColor", field: "Acceleration" })
    .encodeRadius({ target: "horsepowerColor", value: 2.2 })
    .encodeColor({ target: "horsepowerColor", field: "Horsepower", fieldType: "quantitative", scale: { id: "horsepowerColorScale", palette: "blues" } })
    .createLegend({
      target: "horsepowerColor",
      channels: ["color"],
      position: "bottom",
      title: "Horsepower",
      offset: 72
    });
}

function composedDashboard({ cars, nightingale }) {
  const scatter = chart()
    .createCanvas({ width: 360, height: 300, margin: { top: 48, right: 24, bottom: 58, left: 62 } })
    .createData({ id: "cars", values: completeCars(cars, ["Horsepower", "Miles_per_Gallon"]) })
    .createScatterPlot({ x: "Horsepower", y: "Miles_per_Gallon", point: { fill: "#2563eb", opacity: 0.5 } });
  const rose = createNightingaleRoseChart(nightingale);
  const totals = [...new Set(nightingale.map(row => row.cause))].map(cause => ({
    cause,
    value: nightingale.filter(row => row.cause === cause).reduce((sum, row) => sum + row.value, 0)
  }));
  const bars = chart()
    .createCanvas({ width: 360, height: 300, margin: { top: 48, right: 24, bottom: 90, left: 62 } })
    .createData({ id: "causeTotals", values: totals })
    .createBarPlot({ x: { field: "cause", fieldType: "nominal" }, y: "value", color: "cause", guides: { legend: false } });
  return hconcat({ id: "dashboard", programs: [{ id: "scatter", program: scatter }, { id: "detail", program: rose }] })
    .editCompositionLayout({ gap: 24, align: "start" })
    .replaceCompositionChild({ target: "detail", program: bars });
}

function imdbLabelLayout({ imdb }) {
  return chart()
    .createCanvas({ width: 720, height: 460, margin: { top: 64, right: 130, bottom: 66, left: 70 } })
    .createData({ id: "films", values: completeRows(imdb, ["Released_Year", "IMDB_Rating", "Series_Title"]) })
    .createScatterPlot({
      id: "films",
      data: "films",
      x: { field: "Released_Year", fieldType: "temporal" },
      y: { field: "IMDB_Rating", fieldType: "quantitative", scale: { zero: false } },
      point: { fill: "#2563eb", opacity: 0.8 },
      guides: { axes: { x: {}, y: {} }, legend: false }
    })
    .createTextMark({ id: "labels", data: "films", fill: "#334155", fontSize: 10, dx: 7, dy: -6 })
    .encodeX({ target: "labels", field: "Released_Year", fieldType: "temporal", scale: { id: "x" } })
    .encodeY({ target: "labels", field: "IMDB_Rating", fieldType: "quantitative", scale: { id: "y" } })
    .encodeText({ target: "labels", field: "Series_Title" })
    .layoutLabels({
      target: "labels",
      axis: "both",
      padding: 3,
      maxDisplacement: 52,
      bounds: "plot",
      leader: { stroke: "#94a3b8", strokeWidth: 0.8, opacity: 0.9 }
    });
}

function rendererParity({ cars }) {
  return chart()
    .createCanvas({ width: 640, height: 400, margin: { top: 48, right: 130, bottom: 62, left: 70 } })
    .createData({ id: "cars", values: completeCars(cars, ["Horsepower", "Miles_per_Gallon", "Origin"]) })
    .createScatterPlot({ x: "Horsepower", y: "Miles_per_Gallon", color: "Origin", guides: { axes: { x: {}, y: {} }, legend: {} } });
}

const DEFINITIONS = Object.freeze([
  ["cars-scatter-origin", "scatterplot", carsScatterOrigin],
  ["cars-regression-japan", "regression-scatterplot", carsRegressionJapan],
  ["cars-histogram-origin", "histogram", carsHistogramOrigin],
  ["cars-binned-heatmap", "heatmap", ({ cars }) => createCarsBinnedHeatmap(cars)],
  ["cars-temporal-line-origin", "line-chart", carsTemporalLineOrigin],
  ["jobs-grouped-bar", "bar-chart", jobsGroupedBar],
  ["cars-density-origin", "density-area", ({ cars }) => createCarsDensityArea(cars)],
  ["cars-error-bar-origin", "error-bar", ({ cars }) => createCarsErrorBar(cars)],
  ["gapminder-error-band", "error-band", carsErrorBand],
  ["cars-box-plot", "box-plot", ({ cars }) => createCarsBoxPlot(cars)],
  ["cars-violin", "violin-plot", ({ cars }) => createCarsAccelerationViolins(cars)],
  ["cars-parallel-coordinates", "parallel-coordinates", ({ cars }) => createCarsParallelCoordinates(cars)],
  ["nightingale-rose", "rose-chart", ({ nightingale }) => createNightingaleRoseChart(nightingale)],
  ["cars-facet-origin", "facet", carsFacetOrigin],
  ["cars-multi-legend", "cartesian-guide-lifecycle", ({ cars }) => createCarsMultiLegendLayout(cars)],
  ["cars-selection-highlight", "selection-lifecycle", carsSelectionHighlight],
  ["gapminder-moving-window", "time-series-derivation", gapminderMovingWindow],
  ["cars-time-unit", "derived-data-workflows", carsTimeUnit],
  ["cars-rug-distribution", "tick-distribution", carsRugDistribution],
  ["cars-gradient-profile", "gradient-plot", carsGradientProfile],
  ["gapminder-horizon", "horizon", ({ gapminder }) => createGapminderHorizon(gapminder)],
  ["imdb-label-layout", "annotations", imdbLabelLayout],
  ["composed-dashboard", "composition", composedDashboard, ["chart", "hconcat", "render"]],
  ["renderer-parity", "scatterplot", rendererParity, ["chart", "render", "renderToSVG", "renderToPNG", "renderToPDF"]]
]);

export const recipeTaskPrograms = Object.freeze(Object.fromEntries(DEFINITIONS.map(([
  taskId,
  recipeId,
  createProgram,
  runtimeFunctions = ROOT_RUNTIME
]) => [
  taskId,
  Object.freeze({
    taskId,
    recipeId,
    runtimeFunctions: Object.freeze(runtimeFunctions),
    createProgram
  })
])));
