import { loadCars } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { GRADIENT_PLOT_LAYOUT } from "./fixture.js";
import { createCarsGradientPlotPrimitives } from "./primitive.program.js";

const cars = loadCars();

export const gradientPlotTargetCallChain = `chart()
  .createCanvas({
    width: 620,
    height: 460,
    margin: { top: 85, right: 170, bottom: 95, left: 80 }
  })
  .createData({ values: cars })
  .createGradientPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration" },
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
  .encodeColor({
    target: "gradientPlot",
    field: "Origin",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  })
  .createTitle({
    text: "Acceleration Distribution by Origin",
    subtitle: "Gradient intensity shows the within-origin density",
    align: "center"
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-gradient-plot",
    variant: "acceleration-by-origin",
    title: "Cars Acceleration Distribution by Origin",
    callChain: gradientPlotTargetCallChain,
    artifact: { scope: "review" },
    primitive: () => createCarsGradientPlotPrimitives(cars),
    width: GRADIENT_PLOT_LAYOUT.width,
    height: GRADIENT_PLOT_LAYOUT.height,
    colors: ["#334155", "#0f172a"],
    regions: [
      {
        name: "density strips",
        x: 105,
        y: 85,
        width: 320,
        height: 280,
        minimumInkPixels: 13_000
      },
      {
        name: "density legend",
        x: 490,
        y: 110,
        width: 110,
        height: 220,
        minimumInkPixels: 1_000
      }
    ]
  })
]);
