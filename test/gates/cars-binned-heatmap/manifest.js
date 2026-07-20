import { loadCars } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { BINNED_HEATMAP_LAYOUT } from "./fixture.js";
import { createCarsBinnedHeatmapPrimitives } from "./primitive.program.js";

const cars = loadCars();

export const binnedHeatmapTargetCallChain = `chart()
  .createCanvas({
    width: 700,
    height: 500,
    margin: { top: 70, right: 140, bottom: 75, left: 85 }
  })
  .createData({ values: cars })
  .createHeatmap({
    x: { field: "Weight_in_lbs", fieldType: "quantitative" },
    y: { field: "Miles_per_Gallon", fieldType: "quantitative" },
    bin: {
      bins: { x: 10, y: 8 },
      extent: { x: [1500, 5200], y: [8, 48] },
      includeEmpty: true
    },
    color: { scale: { palette: "blues", domain: [0, 33] } },
    rect: { stroke: "#ffffff", strokeWidth: 1 },
    guides: {
      axes: {
        x: { title: { text: "Vehicle weight (lb)" } },
        y: { title: { text: "Miles per gallon" } }
      },
      legend: { title: "Cars per bin", position: "right" }
    }
  })
  .createTitle({
    text: "Fuel Economy by Vehicle Weight",
    subtitle: "398 cars binned into a 10 × 8 grid",
    align: "center"
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-binned-heatmap",
    variant: "weight-mpg-counts",
    title: "Cars Fuel Economy by Vehicle Weight",
    callChain: binnedHeatmapTargetCallChain,
    artifact: { scope: "review" },
    primitive: () => createCarsBinnedHeatmapPrimitives(cars),
    width: BINNED_HEATMAP_LAYOUT.width,
    height: BINNED_HEATMAP_LAYOUT.height,
    colors: ["#cfe1f2", "#0a4a90", "#334155"],
    regions: [
      {
        name: "binned plot",
        x: 85,
        y: 70,
        width: 475,
        height: 355,
        colors: ["#cfe1f2", "#0a4a90"],
        minimumInkPixels: 110_000
      },
      {
        name: "count legend",
        x: 580,
        y: 100,
        width: 100,
        height: 250,
        minimumInkPixels: 500
      }
    ]
  })
]);
