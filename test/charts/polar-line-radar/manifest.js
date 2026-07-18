import { loadGapminder, loadJobs } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { createGapminderPolarTrends } from
  "../../../examples/gapminder-polar-trends/program.js";
import { createJobsRadarChart } from
  "../../../examples/jobs-radar-chart/program.js";

import {
  createGapminderPolarLinePrimitives,
  createJobsRadarPrimitives
} from "./primitive.program.js";

const gapminder = loadGapminder();
const jobs = loadJobs();

export const gapminderTargetCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 620,
    margin: { top: 70, right: 190, bottom: 70, left: 70 }
  })
  .createData({ values: trendRows })
  .createLineMark({ strokeWidth: 2.5, opacity: 0.88 })
  .encodeTheta({
    field: "year",
    scale: { domain: [1955, 2005], range: [0, 330] }
  })
  .encodeR({
    field: "life_expect",
    scale: { domain: [25, 85], zero: false }
  })
  .encodeGroup({ field: "country" })
  .encodeColor({ field: "country", palette: "tableau10" })
  .createGuides({
    axes: {
      theta: {
        ticksAndLabels: { values: [1955, 1965, 1975, 1985, 1995, 2005] },
        title: { text: "Year" }
      },
      radius: {
        ticksAndLabels: { values: [30, 40, 50, 60, 70, 80] },
        title: { text: "Life expectancy" }
      }
    },
    grid: {
      theta: { values: [1955, 1965, 1975, 1985, 1995, 2005] },
      radial: { values: [30, 40, 50, 60, 70, 80] }
    },
    legend: { position: "right" }
  });`;

export const radarTargetCallChain = `chart()
  .createCanvas({
    width: 820,
    height: 650,
    margin: { top: 90, right: 190, bottom: 90, left: 90 }
  })
  .createData({ values: radarRows })
  .createLineMark({ closed: true, strokeWidth: 2.5, opacity: 0.9 })
  .encodeTheta({
    field: "role",
    fieldType: "nominal",
    scale: {
      domain: [
        "Accounting", "Architecture", "Engineering", "Law",
        "Management", "Nursing", "Secretarial", "Teaching"
      ]
    }
  })
  .encodeR({ field: "share", scale: { domain: [0, 1], zero: true } })
  .encodeGroup({ field: "sex" })
  .encodeColor({ field: "sex", palette: "tableau10" })
  .createGuides({
    axes: {
      theta: { title: { text: "Occupation" } },
      radius: {
        ticksAndLabels: { values: [0, 0.25, 0.5, 0.75, 1] },
        title: { text: "Share" }
      }
    },
    grid: {
      theta: {
        values: [
          "Accounting", "Architecture", "Engineering", "Law",
          "Management", "Nursing", "Secretarial", "Teaching"
        ]
      },
      radial: { values: [0, 0.25, 0.5, 0.75, 1] }
    },
    legend: { position: "right", title: "Sex" }
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "gapminder-polar-trends",
    variant: "open",
    title: "Gapminder Open Polar Trends",
    callChain: gapminderTargetCallChain,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase4",
      capability: "polar-line-radar"
    },
    primitive: () => createGapminderPolarLinePrimitives(gapminder),
    userFacing: () => createGapminderPolarTrends(gapminder),
    width: 760,
    height: 620,
    colors: ["#4c78a8", "#f58518", "#e45756", "#d7e0ea"],
    visualSignature: {
      inkRatio: { min: 0.0388, max: 0.0475 },
      inkBounds: {
        x: 39.5,
        y: 41.25,
        width: 671,
        height: 555,
        tolerance: { x: 3.5, y: 1, width: 11, height: 1 }
      }
    },
    regions: [{
      name: "open-polar-lines",
      x: 52,
      y: 42,
      width: 660,
      height: 560,
      minimumInkPixels: 700
    }]
  }),
  defineVisualVariant({
    chart: "jobs-radar-chart",
    variant: "closed",
    title: "Jobs Closed Radar Chart",
    callChain: radarTargetCallChain,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase4",
      capability: "polar-line-radar"
    },
    primitive: () => createJobsRadarPrimitives(jobs),
    userFacing: () => createJobsRadarChart(jobs),
    width: 820,
    height: 650,
    colors: ["#4c78a8", "#f58518", "#d7e0ea"],
    visualSignature: {
      inkRatio: { min: 0.0264, max: 0.0324 },
      inkBounds: {
        x: 71.5,
        y: 80,
        width: 670.5,
        height: 528.5,
        tolerance: { x: 7, y: 1, width: 10.5, height: 1 }
      }
    },
    regions: [{
      name: "closed-radar-lines",
      x: 82,
      y: 70,
      width: 670,
      height: 550,
      minimumInkPixels: 650
    }]
  })
]);
