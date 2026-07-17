import { createCarsBoxPlot } from "./cars-box-plot/program.js";
import { createCarsDensityArea } from "./cars-density-area/program.js";
import { createCarsErrorBarOverlay } from "./cars-error-bar/program.js";
import { createCarsHistogram } from "./cars-histogram/program.js";
import { createCarsLineChart } from "./cars-line-chart/program.js";
import { createCarsRegressionScatterplot } from
  "./cars-regression-scatterplot/program.js";
import { createCarsScatterplot } from "./cars-scatterplot/program.js";
import { createMatchingPopulationColorBars } from
  "./gapminder-continuous-color-bars/program.js";
import { createGapminderQuantizeColorScale } from
  "./gapminder-discretized-color-scales/program.js";
import { createGapminderCurvedBoundaryErrorBand } from
  "./gapminder-error-band/program.js";
import { createGapminderBandPointChart } from
  "./gapminder-temporal-discrete-scales/program.js";
import { createGapminderTransformedScaleScatterplot } from
  "./gapminder-transformed-scales/program.js";
import { createCarsPolarScatterplot } from "./polar-points/program.js";
import { createCarsPolarGuides } from "./polar-guides/program.js";
import { createGapminderPolarTrends } from
  "./gapminder-polar-trends/program.js";
import { createJobsRadarChart } from "./jobs-radar-chart/program.js";
import { createJobsGroupedBar } from "./jobs-grouped-bar/program.js";
import {
  createGroupedMaximumPointHighlight,
  createJapanLineSeriesHighlight,
  createTallestHistogramStackHighlight
} from "./mark-selection/program.js";

function example({ id, data, width, height, createProgram, ...options }) {
  return Object.freeze({
    id,
    data,
    width,
    height,
    createProgram,
    programFile: new URL(`./${options.programDirectory ?? id}/program.js`, import.meta.url),
    testDirectory: options.testDirectory ?? id,
    docsGroup: options.docsGroup,
    browser: options.browser && Object.freeze(options.browser)
  });
}

export const PUBLIC_CHARTS = Object.freeze([
  example({
    id: "cars-scatterplot",
    data: "cars",
    width: 640,
    height: 400,
    createProgram: createCarsScatterplot,
    docsGroup: "charts",
    browser: { path: "cars-scatterplot/", canvas: "#chart" }
  }),
  example({
    id: "cars-polar-scatterplot",
    data: "cars",
    width: 520,
    height: 520,
    createProgram: createCarsPolarScatterplot,
    programDirectory: "polar-points",
    testDirectory: "polar-points",
    docsGroup: "charts",
    browser: { path: "polar-points/", canvas: "#chart" }
  }),
  example({
    id: "cars-polar-guides",
    data: "cars",
    width: 620,
    height: 620,
    createProgram: createCarsPolarGuides,
    programDirectory: "polar-guides",
    testDirectory: "polar-guides",
    docsGroup: "charts",
    browser: { path: "polar-guides/", canvas: "#chart" }
  }),
  example({
    id: "gapminder-polar-trends",
    data: "gapminder",
    width: 760,
    height: 620,
    createProgram: createGapminderPolarTrends,
    testDirectory: "polar-line-radar",
    docsGroup: "charts",
    browser: { path: "gapminder-polar-trends/", canvas: "#chart" }
  }),
  example({
    id: "jobs-radar-chart",
    data: "jobs",
    width: 820,
    height: 650,
    createProgram: createJobsRadarChart,
    testDirectory: "polar-line-radar",
    docsGroup: "charts",
    browser: { path: "jobs-radar-chart/", canvas: "#chart" }
  }),
  example({
    id: "cars-line-chart",
    data: "cars",
    width: 720,
    height: 460,
    createProgram: createCarsLineChart,
    docsGroup: "charts",
    browser: { path: "cars-line-chart/", canvas: "#chart" }
  }),
  example({
    id: "cars-histogram",
    data: "cars",
    width: 432,
    height: 460,
    createProgram: createCarsHistogram,
    docsGroup: "charts",
    browser: { path: "cars-histogram/", canvas: "#chart" }
  }),
  example({
    id: "jobs-grouped-bar",
    data: "jobs",
    width: 720,
    height: 460,
    createProgram: createJobsGroupedBar,
    docsGroup: "charts",
    browser: { path: "jobs-grouped-bar/", canvas: "#chart" }
  }),
  example({
    id: "cars-regression-scatterplot",
    data: "cars",
    width: 760,
    height: 480,
    createProgram: createCarsRegressionScatterplot,
    docsGroup: "charts",
    browser: { path: "cars-regression-scatterplot/", canvas: "#chart" }
  }),
  example({
    id: "cars-density-area",
    data: "cars",
    width: 720,
    height: 500,
    createProgram: createCarsDensityArea,
    docsGroup: "charts",
    browser: { path: "cars-density-area/", canvas: "#chart" }
  }),
  example({
    id: "cars-error-bar",
    data: "cars",
    width: 720,
    height: 460,
    createProgram: createCarsErrorBarOverlay,
    docsGroup: "charts",
    browser: { path: "cars-error-bar/", canvas: "#chart" }
  }),
  example({
    id: "cars-box-plot",
    data: "cars",
    width: 360,
    height: 460,
    createProgram: createCarsBoxPlot,
    docsGroup: "charts",
    browser: { path: "cars-box-plot/", canvas: "#chart" }
  }),
  example({
    id: "gapminder-error-band",
    data: "gapminder",
    width: 760,
    height: 480,
    createProgram: createGapminderCurvedBoundaryErrorBand,
    docsGroup: "charts",
    browser: { path: "gapminder-error-band/", canvas: "#chart" }
  }),
  example({
    id: "gapminder-continuous-color-bars",
    data: "gapminder",
    width: 680,
    height: 380,
    createProgram: createMatchingPopulationColorBars
  }),
  example({
    id: "gapminder-discretized-color-scales",
    data: "gapminder",
    width: 480,
    height: 312,
    createProgram: createGapminderQuantizeColorScale
  }),
  example({
    id: "gapminder-temporal-discrete-scales",
    data: "gapminder",
    width: 456,
    height: 312,
    createProgram: createGapminderBandPointChart
  }),
  example({
    id: "gapminder-transformed-scales",
    data: "gapminder",
    width: 456,
    height: 312,
    createProgram: createGapminderTransformedScaleScatterplot
  }),
  example({
    id: "mark-selection-points",
    data: "cars",
    width: 760,
    height: 440,
    createProgram: createGroupedMaximumPointHighlight,
    programDirectory: "mark-selection",
    testDirectory: "mark-selection-points",
    docsGroup: "tutorials",
    browser: { path: "mark-selection/", canvas: "#points-chart" }
  }),
  example({
    id: "mark-selection-bars",
    data: "cars",
    width: 432,
    height: 460,
    createProgram: createTallestHistogramStackHighlight,
    programDirectory: "mark-selection",
    testDirectory: "mark-selection-bars",
    docsGroup: "tutorials",
    browser: { path: "mark-selection/", canvas: "#bars-chart" }
  }),
  example({
    id: "mark-selection-lines",
    data: "cars",
    width: 720,
    height: 460,
    createProgram: createJapanLineSeriesHighlight,
    programDirectory: "mark-selection",
    testDirectory: "mark-selection-lines",
    docsGroup: "tutorials",
    browser: { path: "mark-selection/", canvas: "#lines-chart" }
  })
]);

export function publicCharts(options = {}) {
  return PUBLIC_CHARTS.filter(chart =>
    (options.docsGroup === undefined || chart.docsGroup === options.docsGroup) &&
    (options.browser === undefined || Boolean(chart.browser) === options.browser)
  );
}

export function publicChart(id) {
  const chart = PUBLIC_CHARTS.find(candidate => candidate.id === id);
  if (!chart) throw new Error(`Unknown public chart "${id}".`);
  return chart;
}
