import { defineVisualVariant } from "../../support/visual-variants.js";
import { loadCars } from "../../support/data.js";

import {
  createCarsCombinedLegendComparison,
  createThreeBlockLegendComparison
} from "./primitive.program.js";
import { createHorizontalLegendLaneComparison } from "./horizontal.program.js";
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
  })
]);
