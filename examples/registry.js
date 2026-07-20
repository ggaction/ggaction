import { createCarsBoxPlot } from "./cars-box-plot/program.js";
import { createCarsGradientPlot } from "./cars-gradient-plot/program.js";
import { createCarsOriginDonut } from "./cars-origin-donut/program.js";
import { createCarsDensityArea } from "./cars-density-area/program.js";
import { createCarsAccelerationViolins } from
  "./cars-acceleration-violins/program.js";
import { createCarsErrorBarOverlay } from "./cars-error-bar/program.js";
import { createCarsHistogram } from "./cars-histogram/program.js";
import { createCarsLineChart } from "./cars-line-chart/program.js";
import { createCarsTemporalBarLine } from
  "./cars-temporal-bar-line/program.js";
import { createCarsRegressionScatterplot } from
  "./cars-regression-scatterplot/program.js";
import { createCarsScatterplot } from "./cars-scatterplot/program.js";
import { createCarsBinnedHeatmap } from "./cars-binned-heatmap/program.js";
import { createCarsWindowRankScatterplot } from
  "./cars-window-rank-scatterplot/program.js";
import {
  createCarsOriginJitter,
  createGapminderClusterJitter
} from "./point-jitter/program.js";
import { createAnnotatedImdbScatterplot } from
  "./annotated-imdb-scatterplot/program.js";
import { createGapminderLifeExpectancyHeatmap } from
  "./gapminder-life-expectancy-heatmap/program.js";
import { createCarsOriginScatterplotFacet } from
  "./cars-origin-scatterplot-facet/program.js";
import { createMatchingPopulationColorBars } from
  "./gapminder-continuous-color-bars/program.js";
import { createGapminderQuantizeColorScale } from
  "./gapminder-discretized-color-scales/program.js";
import { createGapminderCurvedBoundaryErrorBand } from
  "./gapminder-error-band/program.js";
import { createGapminderHorizon } from "./gapminder-horizon/program.js";
import { createGapminderRadialBars } from
  "./gapminder-radial-bars/program.js";
import { createGapminderPopulationDonut } from
  "./gapminder-population-donut/program.js";
import { createGapminderBandPointChart } from
  "./gapminder-temporal-discrete-scales/program.js";
import { createGapminderTransformedScaleScatterplot } from
  "./gapminder-transformed-scales/program.js";
import { createGapminderDevelopmentTrajectories } from
  "./gapminder-development-trajectories/program.js";
import { createCarsPolarScatterplot } from "./polar-points/program.js";
import { createCarsPolarGuides } from "./polar-guides/program.js";
import { createGapminderPolarTrends } from
  "./gapminder-polar-trends/program.js";
import { createJobsRadarChart } from "./jobs-radar-chart/program.js";
import { createJobsGroupedBar } from "./jobs-grouped-bar/program.js";
import { createJobsHorizontalGroupedBar } from
  "./jobs-horizontal-grouped-bar/program.js";
import { createNightingaleRoseChart } from
  "./nightingale-rose-chart/program.js";
import { createCrossFeatureDashboard } from
  "./cross-feature-dashboard/program.js";
import { createProgramCompositionExample } from
  "./program-composition/program.js";
import {
  createGroupedMaximumPointHighlight,
  createJapanLineSeriesHighlight,
  createTallestHistogramStackHighlight
} from "./mark-selection/program.js";

function example({ id, data, width, height, createProgram, ...options }) {
  return Object.freeze({
    id,
    data: data && typeof data === "object" ? Object.freeze({ ...data }) : data,
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
    id: "cars-binned-heatmap",
    data: "cars",
    width: 700,
    height: 500,
    createProgram: createCarsBinnedHeatmap,
    browser: {
      path: "cars-binned-heatmap/",
      canvas: "#chart",
      state: {
        global: "__carsBinnedHeatmap",
        expected: { width: 700, height: 500, cells: 80 }
      }
    }
  }),
  example({
    id: "cars-window-rank-scatterplot",
    data: "cars",
    width: 760,
    height: 500,
    createProgram: createCarsWindowRankScatterplot,
    browser: {
      path: "cars-window-rank-scatterplot/",
      canvas: "#chart",
      state: {
        global: "__carsWindowRankScatterplot",
        expected: { width: 760, height: 500, points: 47 }
      }
    }
  }),
  example({
    id: "cross-feature-dashboard",
    data: {
      cars: "cars",
      nightingale: "nightingaleRose",
      fashionRows: "fashionTsne"
    },
    width: 1220,
    height: 866,
    createProgram: createCrossFeatureDashboard,
    testDirectory: "cross-feature-integration"
  }),
  example({
    id: "program-composition",
    data: "cars",
    width: 588,
    height: 244,
    createProgram: createProgramCompositionExample,
    docsGroup: "charts",
    browser: { path: "program-composition/", canvas: "#chart" }
  }),
  example({
    id: "cars-origin-scatterplot-facet",
    data: "cars",
    width: 932,
    height: 282,
    createProgram: createCarsOriginScatterplotFacet,
    docsGroup: "charts"
  }),
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
    id: "cars-origin-jitter",
    data: "cars",
    width: 640,
    height: 440,
    createProgram: createCarsOriginJitter,
    programDirectory: "point-jitter",
    testDirectory: "point-jitter",
    browser: { path: "point-jitter/", canvas: "#chart" }
  }),
  example({
    id: "gapminder-cluster-jitter",
    data: "gapminder",
    width: 680,
    height: 460,
    createProgram: createGapminderClusterJitter,
    programDirectory: "point-jitter",
    testDirectory: "point-jitter"
  }),
  example({
    id: "annotated-imdb-scatterplot",
    data: "imdbSelected",
    width: 720,
    height: 460,
    createProgram: createAnnotatedImdbScatterplot,
    docsGroup: "charts",
    browser: { path: "annotated-imdb-scatterplot/", canvas: "#chart" }
  }),
  example({
    id: "gapminder-life-expectancy-heatmap",
    data: "gapminder",
    width: 760,
    height: 440,
    createProgram: createGapminderLifeExpectancyHeatmap,
    docsGroup: "charts",
    browser: {
      path: "gapminder-life-expectancy-heatmap/",
      canvas: "#chart"
    }
  }),
  example({
    id: "gapminder-development-trajectories",
    data: "gapminder",
    width: 760,
    height: 500,
    createProgram: createGapminderDevelopmentTrajectories,
    docsGroup: "charts",
    browser: {
      path: "gapminder-development-trajectories/",
      canvas: "#chart",
      state: {
        global: "__gapminderDevelopmentTrajectories",
        expected: { width: 760, height: 500, paths: 3 }
      }
    }
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
    browser: {
      path: "polar-guides/",
      canvas: "#chart",
      state: {
        global: "__polarGuides",
        expected: { width: 620, height: 620, points: 400, thetaLabels: 6, radialLabels: 5 }
      }
    }
  }),
  example({
    id: "gapminder-polar-trends",
    data: "gapminder",
    width: 760,
    height: 620,
    createProgram: createGapminderPolarTrends,
    testDirectory: "polar-line-radar",
    docsGroup: "charts",
    browser: {
      path: "gapminder-polar-trends/",
      canvas: "#chart",
      state: {
        global: "__gapminderPolarTrends",
        expected: { width: 760, height: 620, paths: 3, closed: false }
      }
    }
  }),
  example({
    id: "jobs-radar-chart",
    data: "jobs",
    width: 820,
    height: 650,
    createProgram: createJobsRadarChart,
    testDirectory: "polar-line-radar",
    docsGroup: "charts",
    browser: {
      path: "jobs-radar-chart/",
      canvas: "#chart",
      state: {
        global: "__jobsRadarChart",
        expected: { width: 820, height: 650, paths: 2, closed: true }
      }
    }
  }),
  example({
    id: "cars-origin-donut",
    data: "cars",
    width: 640,
    height: 500,
    createProgram: createCarsOriginDonut,
    testDirectory: "polar-arcs",
    docsGroup: "charts",
    browser: {
      path: "cars-origin-donut/",
      canvas: "#chart",
      state: {
        global: "__carsOriginDonut",
        expected: { width: 640, height: 500, paths: 3 }
      }
    }
  }),
  example({
    id: "gapminder-population-donut",
    data: "gapminder",
    width: 680,
    height: 520,
    createProgram: createGapminderPopulationDonut,
    testDirectory: "polar-arcs",
    docsGroup: "charts",
    browser: {
      path: "gapminder-population-donut/",
      canvas: "#chart",
      state: {
        global: "__gapminderPopulationDonut",
        expected: { width: 680, height: 520, paths: 6, rows: 62 }
      }
    }
  }),
  example({
    id: "nightingale-rose-chart",
    data: "nightingaleRose",
    width: 780,
    height: 640,
    createProgram: createNightingaleRoseChart,
    testDirectory: "polar-arcs",
    docsGroup: "charts",
    browser: {
      path: "nightingale-rose-chart/",
      canvas: "#chart",
      state: {
        global: "__nightingaleRoseChart",
        expected: { width: 780, height: 640, paths: 32 }
      }
    }
  }),
  example({
    id: "gapminder-radial-bars",
    data: "gapminder",
    width: 780,
    height: 640,
    createProgram: createGapminderRadialBars,
    testDirectory: "polar-arcs",
    docsGroup: "charts",
    browser: {
      path: "gapminder-radial-bars/",
      canvas: "#chart",
      state: {
        global: "__gapminderRadialBars",
        expected: { width: 780, height: 640, paths: 12 }
      }
    }
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
    id: "cars-temporal-bar-line",
    data: "cars",
    width: 720,
    height: 440,
    createProgram: createCarsTemporalBarLine,
    docsGroup: "charts",
    browser: { path: "cars-temporal-bar-line/", canvas: "#chart" }
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
    id: "jobs-horizontal-grouped-bar",
    data: "jobs",
    width: 760,
    height: 640,
    createProgram: createJobsHorizontalGroupedBar,
    docsGroup: "charts",
    browser: { path: "jobs-horizontal-grouped-bar/", canvas: "#chart" }
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
    id: "gapminder-horizon",
    data: "gapminder",
    width: 760,
    height: 300,
    createProgram: createGapminderHorizon,
    docsGroup: "charts",
    browser: { path: "gapminder-horizon/", canvas: "#chart" }
  }),
  example({
    id: "cars-acceleration-violins",
    data: "cars",
    width: 720,
    height: 520,
    createProgram: createCarsAccelerationViolins,
    docsGroup: "charts",
    browser: { path: "cars-acceleration-violins/", canvas: "#chart" }
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
    id: "cars-gradient-plot",
    data: "cars",
    width: 620,
    height: 460,
    createProgram: createCarsGradientPlot,
    docsGroup: "charts",
    browser: { path: "cars-gradient-plot/", canvas: "#chart" }
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
