import {
  loadCars,
  loadGapminder,
  loadNightingaleRose
} from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import {
  createCarsOriginDonutPrimitives,
  createGapminderRadialBarPrimitives,
  createNightingaleRosePrimitives
} from "./primitive.program.js";

const cars = loadCars();
const gapminder = loadGapminder();
const nightingale = loadNightingaleRose();

export const carsDonutTargetCallChain = `chart()
  .createCanvas({
    width: 640,
    height: 500,
    margin: { top: 55, right: 190, bottom: 55, left: 55 }
  })
  .createData({ values: cars })
  .createArcMark({ innerRadius: 0.56, padAngle: 1.5 })
  .encodeTheta({ field: "Origin", aggregate: "count" })
  .encodeColor({ field: "Origin", palette: "tableau10" })
  .createGuides({
    axes: false,
    grid: false,
    legend: { position: "right", title: "Origin" }
  });`;

export const nightingaleTargetCallChain = `chart()
  .createCanvas({
    width: 780,
    height: 640,
    margin: { top: 80, right: 210, bottom: 80, left: 80 }
  })
  .createData({ values: nightingale })
  .createArcMark({ padAngle: 1, opacity: 0.9 })
  .encodeTheta({
    field: "month",
    fieldType: "ordinal",
    scale: { domain: monthOrder }
  })
  .encodeR({ field: "value", scale: { domain: [0, 6.5], zero: true } })
  .encodeColor({
    field: "cause",
    layout: "overlay",
    scale: {
      domain: causeOrder,
      range: ["#599ad3", "#727272", "#f1595f"]
    }
  })
  .createGuides({
    axes: {
      theta: { title: false },
      radius: { ticksAndLabels: { values: [0, 2, 4, 6] }, title: false }
    },
    grid: { theta: false, radial: { values: [2, 4, 6] } },
    legend: { position: "right", title: "Cause" }
  });`;

export const gapminderRadialTargetCallChain = `chart()
  .createCanvas({
    width: 780,
    height: 640,
    margin: { top: 75, right: 190, bottom: 75, left: 75 }
  })
  .createData({ values: countryRows })
  .createArcMark({ innerRadius: 0.18, padAngle: 2 })
  .encodeTheta({
    field: "country",
    fieldType: "nominal",
    scale: { domain: countryOrder }
  })
  .encodeR({
    field: "life_expect",
    scale: { domain: [45, 85], zero: false }
  })
  .encodeColor({ field: "cluster", fieldType: "nominal", palette: "tableau10" })
  .createGuides({
    axes: {
      theta: { title: { text: "Country" } },
      radius: {
        ticksAndLabels: { values: [50, 60, 70, 80] },
        title: { text: "Life expectancy" }
      }
    },
    grid: { theta: false, radial: { values: [50, 60, 70, 80] } },
    legend: { position: "right", title: "Cluster" }
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-origin-donut",
    variant: "count",
    title: "Cars Origin Donut",
    callChain: carsDonutTargetCallChain,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase5",
      capability: "polar-arcs"
    },
    primitive: () => createCarsOriginDonutPrimitives(cars),
    width: 640,
    height: 500,
    colors: ["#4c78a8", "#f58518", "#e45756"],
    regions: [{
      name: "donut-sectors",
      x: 45,
      y: 45,
      width: 410,
      height: 410,
      minimumInkPixels: 1200
    }]
  }),
  defineVisualVariant({
    chart: "nightingale-rose-chart",
    variant: "overlay",
    title: "Nightingale Rose Chart",
    callChain: nightingaleTargetCallChain,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase5",
      capability: "polar-arcs"
    },
    primitive: () => createNightingaleRosePrimitives(nightingale),
    width: 780,
    height: 640,
    colors: ["#599ad3", "#727272", "#f1595f", "#d7e0ea"],
    regions: [{
      name: "rose-sectors",
      x: 55,
      y: 55,
      width: 540,
      height: 530,
      minimumInkPixels: 1000
    }]
  }),
  defineVisualVariant({
    chart: "gapminder-radial-bars",
    variant: "life-expectancy",
    title: "Gapminder Radial Bars",
    callChain: gapminderRadialTargetCallChain,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase5",
      capability: "polar-arcs"
    },
    primitive: () => createGapminderRadialBarPrimitives(gapminder),
    width: 780,
    height: 640,
    colors: ["#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b", "#eeca3b"],
    regions: [{
      name: "radial-bars",
      x: 50,
      y: 45,
      width: 565,
      height: 550,
      minimumInkPixels: 1200
    }]
  })
]);
