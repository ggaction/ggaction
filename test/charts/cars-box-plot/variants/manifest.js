import { defineVisualVariant } from "../../../support/visual-variants.js";
import { loadCars } from "../../../support/data.js";
import {
  createCarsBoxPlot,
  createCarsHorizontalMinmaxBoxPlot
} from "../../../../examples/cars-box-plot/program.js";

import { createCarsBoxPlotPrimitives } from "../primitive.program.js";
import { createCarsHorizontalMinmaxPrimitives } from "./horizontal-minmax.program.js";
import {
  BOX_PLOT_COLORS,
  BOX_PLOT_LAYOUT,
  BOX_PLOT_STYLE,
  HORIZONTAL_MINMAX_LAYOUT
} from "../reference-values.js";
import { boxPlotOptionVariants } from "./options/manifest.js";

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

const horizontalMinmaxCallChain = `chart()
  .createCanvas({
    width: 560,
    height: 340,
    margin: { top: 90, right: 40, bottom: 65, left: 80 }
  })
  .createData({ values: cars })
  .createBoxPlot({
    x: { field: "Horsepower" },
    y: { field: "Origin", fieldType: "nominal" },
    whisker: { type: "minmax" }
  })
  .encodeColor({
    target: "boxPlot",
    field: "Origin",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  })
  .createGuides({
    grid: { horizontal: false, vertical: {} },
    legend: false
  })
  .createTitle({
    text: "Horsepower Range by Origin",
    subtitle: "Min–max whiskers with no outlier layer"
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-box-plot",
    variant: "cars-vertical-tukey",
    title: "Cars Vertical Tukey Box Plot",
    callChain: targetCallChain,
    primitive: () => createCarsBoxPlotPrimitives(loadCars()),
    userFacing: () => createCarsBoxPlot(loadCars()),
    width: BOX_PLOT_LAYOUT.width,
    height: BOX_PLOT_LAYOUT.height,
    colors: [...BOX_PLOT_COLORS, BOX_PLOT_STYLE.whiskerStroke],
    regions: [
      { name: "plot", x: 80, y: 140, width: 240, height: 250 }
    ]
  }),
  defineVisualVariant({
    chart: "cars-box-plot",
    variant: "cars-horizontal-minmax",
    title: "Cars Horizontal Minmax Box Plot",
    callChain: horizontalMinmaxCallChain,
    primitive: () => createCarsHorizontalMinmaxPrimitives(loadCars()),
    userFacing: () => createCarsHorizontalMinmaxBoxPlot(loadCars()),
    width: HORIZONTAL_MINMAX_LAYOUT.width,
    height: HORIZONTAL_MINMAX_LAYOUT.height,
    colors: [...BOX_PLOT_COLORS, BOX_PLOT_STYLE.whiskerStroke],
    regions: [
      { name: "plot", x: 80, y: 90, width: 440, height: 185 }
    ]
  }),
  ...boxPlotOptionVariants
]);
