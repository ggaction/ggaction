import { defineVisualVariant } from "../../../support/visual-variants.js";
import { loadCars } from "../../../support/data.js";
import { createCarsBoxPlot } from "../../../../examples/cars-box-plot/program.js";

import { createCarsBoxPlotPrimitives } from "../primitive.program.js";
import {
  BOX_PLOT_COLORS,
  BOX_PLOT_LAYOUT,
  BOX_PLOT_STYLE
} from "../reference-values.js";

const targetCallChain = `chart()
  .createCanvas({
    width: 360,
    height: 460,
    margin: { top: 140, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" }
  })
  .encodeColor({
    target: "boxPlot",
    field: "Origin",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  })
  .createGuides({ legend: false })
  .createTitle({
    text: "Fuel Economy Distribution by Origin",
    subtitle: "Tukey box plot with 1.5× IQR whiskers",
    maxWidth: 240
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-box-plot",
    variant: "cars-vertical-tukey",
    title: "Cars Vertical Tukey Box Plot",
    callChain: targetCallChain,
    primitive: createCarsBoxPlotPrimitives(loadCars()),
    userFacing: createCarsBoxPlot(loadCars()),
    width: BOX_PLOT_LAYOUT.width,
    height: BOX_PLOT_LAYOUT.height,
    colors: [...BOX_PLOT_COLORS, BOX_PLOT_STYLE.whiskerStroke],
    regions: [
      { name: "plot", x: 80, y: 140, width: 240, height: 250 }
    ]
  })
]);
