import { loadCars, loadGapminder, loadJobs } from "../../../../support/data.js";
import { defineVisualVariant } from "../../../../support/visual-variants.js";

import {
  createNestedDashboardPrimitives,
  createReplacementPrimitives,
  createUnequalHorizontalPrimitives
} from "./primitive.program.js";
import {
  createNestedDashboardPublic,
  createReplacementPublic,
  createUnequalHorizontalPublic
} from "./public.program.js";
import { createCompositionValues } from "./reference-values.js";

const cars = loadCars();
const jobs = loadJobs();
const gapminder = loadGapminder();
const values = createCompositionValues({ cars, jobs, gapminder });
const artifact = Object.freeze({
  capability: "program-composition"
});

export const unequalHorizontalTarget = `hconcat({
  id: "overview",
  programs: [
    { id: "main", program: carsScatterplot },
    { id: "detail", program: jobsGroupedBar }
  ],
  gap: 20,
  padding: 16
});`;

export const nestedDashboardTarget = `vconcat({
  id: "dashboard",
  programs: [
    { id: "overview", program: overview },
    { id: "trend", program: gapminderLineChart }
  ],
  gap: 18,
  padding: 14
});`;

export const replacementTarget = `overview
  .editCompositionLayout({ gap: 28, align: "start", padding: 12 })
  .replaceCompositionChild({
    target: "detail",
    program: carsOriginDonut
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "program-composition",
    variant: "unequal-horizontal",
    title: "Unequal Horizontal Dashboard",
    callChain: unequalHorizontalTarget,
    programEquivalence: "render",
    artifact,
    primitive: () => createUnequalHorizontalPrimitives(cars, jobs, gapminder),
    userFacing: () => createUnequalHorizontalPublic(cars, jobs, gapminder),
    width: values.overview.width,
    height: values.overview.height,
    colors: ["#4c78a8", "#f58518"],
    regions: [
      { name: "main-panel", x: 16, y: 16, width: 440, height: 320, minimumInkPixels: 400 },
      { name: "detail-panel", x: 476, y: 16, width: 300, height: 320, minimumInkPixels: 250 }
    ]
  }),
  defineVisualVariant({
    chart: "program-composition",
    variant: "nested-dashboard",
    title: "Nested Horizontal and Vertical Dashboard",
    callChain: nestedDashboardTarget,
    programEquivalence: "render",
    artifact,
    primitive: () => createNestedDashboardPrimitives(cars, jobs, gapminder),
    userFacing: () => createNestedDashboardPublic(cars, jobs, gapminder),
    width: values.nested.width,
    height: values.nested.height,
    colors: ["#4c78a8", "#f58518", "#e45756", "#54a24b"],
    regions: [
      { name: "nested-overview", x: 14, y: 14, width: 792, height: 352, minimumInkPixels: 650 },
      { name: "trend-panel", x: 14, y: 384, width: 792, height: 220, minimumInkPixels: 250 }
    ]
  }),
  defineVisualVariant({
    chart: "program-composition",
    variant: "replacement",
    title: "Stable Detail Slot Replacement",
    callChain: replacementTarget,
    programEquivalence: "render",
    artifact,
    primitive: () => createReplacementPrimitives(cars, jobs, gapminder),
    userFacing: () => createReplacementPublic(cars, jobs, gapminder),
    width: values.replacement.width,
    height: values.replacement.height,
    colors: ["#4c78a8", "#f58518", "#e45756"],
    regions: [
      { name: "main-panel", x: 12, y: 12, width: 440, height: 320, minimumInkPixels: 400 },
      { name: "replacement-panel", x: 480, y: 12, width: 280, height: 280, minimumInkPixels: 300 }
    ]
  })
]);
