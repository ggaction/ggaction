import { defineVisualVariant } from "../../support/visual-variants.js";
import { loadCars } from "../../support/data.js";

import {
  createCarsCombinedLegendComparison,
  createThreeBlockLegendComparison
} from "./primitive.program.js";
import {
  createHorizontalLegendLaneComparison,
  createHorizontalLegendOptionProgram
} from "./horizontal.program.js";
import { REVIEW_LAYOUT } from "./reference-values.js";

const cars = loadCars();

export const combinedCallChain = `hconcat({
  id: "carsCombinedLegendComparison",
  programs: [
    { id: "current", program: current },
    { id: "target", program: target }
  ],
  gap: 24,
  padding: 8,
  align: "start"
});`;

export const threeBlockCallChain = `hconcat({
  id: "threeBlockLegendComparison",
  programs: [
    { id: "current", program: current },
    { id: "target", program: target }
  ],
  gap: 24,
  padding: 8,
  align: "start"
});`;

export const horizontalCallChain = `hconcat({
  id: "horizontalLegendLaneComparison",
  programs: [
    { id: "top", program: top },
    { id: "bottom", program: bottom }
  ],
  gap: 24,
  padding: 8,
  align: "start"
});`;

function optionCallChain({ gap, inlineTitles, inlineContinuousLabels = false }) {
  const continuous = inlineContinuousLabels
    ? ", inlineContinuousLabels: true"
    : "";
  return `horizontalLegendOption({ gap: ${gap}, inlineTitles: ${inlineTitles}${continuous} });`;
}

function comparisonDimensions(width, height) {
  return {
    width: REVIEW_LAYOUT.padding * 2 + width * 2 + REVIEW_LAYOUT.gap,
    height: REVIEW_LAYOUT.padding * 2 + height
  };
}

function panelRegions(width, height) {
  return ["current", "target"].map((name, index) => ({
    name,
    x: REVIEW_LAYOUT.padding + index * (width + REVIEW_LAYOUT.gap),
    y: REVIEW_LAYOUT.padding,
    width,
    height,
    minimumInkPixels: 900
  }));
}

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "multi-legend-layout",
    variant: "cars-combined-right-lane",
    title: "Cars Legends · Split Anchors vs Aligned Lane",
    callChain: combinedCallChain,
    artifact: { scope: "review" },
    primitive: () => createCarsCombinedLegendComparison(cars),
    ...comparisonDimensions(REVIEW_LAYOUT.carsWidth, REVIEW_LAYOUT.carsHeight),
    colors: [
      { value: "#4c78a8", minimumPixels: 120 },
      { value: "#f58518", minimumPixels: 80 }
    ],
    regions: panelRegions(REVIEW_LAYOUT.carsWidth, REVIEW_LAYOUT.carsHeight)
  }),
  defineVisualVariant({
    chart: "multi-legend-layout",
    variant: "cars-color-size-opacity-stack",
    title: "Cars Three-Legend Scatterplot · Drift vs Aligned Lane",
    callChain: threeBlockCallChain,
    artifact: { scope: "review" },
    primitive: () => createThreeBlockLegendComparison(cars),
    ...comparisonDimensions(REVIEW_LAYOUT.multiWidth, REVIEW_LAYOUT.multiHeight),
    colors: [
      { value: "#4c78a8", minimumPixels: 100 },
      { value: "#f58518", minimumPixels: 20 },
      { value: "#e45756", minimumPixels: 20 }
    ],
    regions: panelRegions(REVIEW_LAYOUT.multiWidth, REVIEW_LAYOUT.multiHeight)
  }),
  defineVisualVariant({
    chart: "multi-legend-layout",
    variant: "cars-top-bottom-lanes",
    title: "Cars Multi-Legend Scatterplot · Top and Bottom Lanes",
    callChain: horizontalCallChain,
    artifact: { scope: "review" },
    primitive: () => createHorizontalLegendLaneComparison(cars),
    ...comparisonDimensions(REVIEW_LAYOUT.multiWidth, 620),
    colors: [
      { value: "#4c78a8", minimumPixels: 100 },
      { value: "#f58518", minimumPixels: 20 },
      { value: "#e45756", minimumPixels: 20 }
    ],
    regions: panelRegions(REVIEW_LAYOUT.multiWidth, 620)
  }),
  ...[
    {
      variant: "cars-top-legends-gap-24",
      title: "Cars Top Legends · 24 Pixel Block Gap",
      gap: 24,
      inlineTitles: false,
      label: "24 PX · titles above"
    },
    {
      variant: "cars-top-legends-gap-32",
      title: "Cars Top Legends · 32 Pixel Block Gap",
      gap: 32,
      inlineTitles: false,
      label: "32 PX · titles above"
    },
    {
      variant: "cars-top-legends-gap-40",
      title: "Cars Top Legends · 40 Pixel Block Gap",
      gap: 40,
      inlineTitles: false,
      label: "40 PX · titles above"
    },
    {
      variant: "cars-top-legends-inline-gap-40",
      title: "Cars Top Legends · Inline Titles and 40 Pixel Gap",
      gap: 40,
      inlineTitles: true,
      inlineContinuousLabels: false,
      label: "40 PX · inline titles"
    },
    {
      variant: "cars-top-legends-single-line-gap-40",
      title: "Cars Top Legends · Single-Line Continuous Labels",
      gap: 40,
      inlineTitles: true,
      inlineContinuousLabels: true,
      label: "40 PX · fully inline"
    }
  ].map(options => defineVisualVariant({
    chart: "multi-legend-layout",
    variant: options.variant,
    title: options.title,
    callChain: optionCallChain(options),
    artifact: { scope: "review" },
    primitive: () => createHorizontalLegendOptionProgram(cars, options),
    width: REVIEW_LAYOUT.multiWidth,
    height: 620,
    colors: [
      { value: "#4c78a8", minimumPixels: 50 },
      { value: "#f58518", minimumPixels: 10 },
      { value: "#e45756", minimumPixels: 10 }
    ],
    regions: [{
      name: "chart",
      x: 0,
      y: 0,
      width: REVIEW_LAYOUT.multiWidth,
      height: 620,
      minimumInkPixels: 900
    }]
  }))
]);
