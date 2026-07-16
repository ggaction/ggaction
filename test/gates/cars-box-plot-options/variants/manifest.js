import { defineVisualVariant } from "../../../support/visual-variants.js";
import { loadCars } from "../../../support/data.js";
import {
  BOX_PLOT_COLORS,
  BOX_PLOT_LAYOUT,
  BOX_PLOT_STYLE
} from "../../../charts/cars-box-plot/reference-values.js";
import {
  createCarsOutliersOffPrimitives,
  createCarsStyledFactorPrimitives
} from "../primitive.program.js";
import { STYLED_FACTOR_STYLE } from "../reference-values.js";

const styledFactorCallChain = `chart()
  .createCanvas({
    width: 360,
    height: 460,
    margin: { top: 140, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" },
    whisker: { type: "tukey", factor: 1 },
    width: { band: 0.5 },
    box: {
      fill: "#f28e2b",
      opacity: 0.82,
      stroke: "#9a3412",
      strokeWidth: 2
    },
    median: { stroke: "#431407", strokeWidth: 3 },
    outlier: { shape: "diamond", radius: 4, opacity: 0.9 }
  })
  .createGuides({ legend: false })
  .createTitle({
    text: "Fuel Economy Distribution by Origin",
    subtitle: "Factor 1.0 with custom styling",
    maxWidth: 240
  });`;

const outliersOffCallChain = `chart()
  .createCanvas({
    width: 360,
    height: 460,
    margin: { top: 140, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createBoxPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Miles_per_Gallon" },
    outliers: false
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
    subtitle: "Tukey summaries with outlier points disabled",
    maxWidth: 240
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-box-plot",
    variant: "cars-styled-factor",
    title: "Cars Styled Factor Box Plot",
    callChain: styledFactorCallChain,
    primitive: createCarsStyledFactorPrimitives(loadCars()),
    width: BOX_PLOT_LAYOUT.width,
    height: BOX_PLOT_LAYOUT.height,
    colors: [
      STYLED_FACTOR_STYLE.medianStroke,
      STYLED_FACTOR_STYLE.outlierFill
    ],
    regions: [
      { name: "plot", x: 80, y: 140, width: 240, height: 250 }
    ]
  }),
  defineVisualVariant({
    chart: "cars-box-plot",
    variant: "cars-outliers-off",
    title: "Cars Box Plot without Outliers",
    callChain: outliersOffCallChain,
    primitive: createCarsOutliersOffPrimitives(loadCars()),
    width: BOX_PLOT_LAYOUT.width,
    height: BOX_PLOT_LAYOUT.height,
    colors: [...BOX_PLOT_COLORS, BOX_PLOT_STYLE.whiskerStroke],
    regions: [
      { name: "plot", x: 80, y: 140, width: 240, height: 250 }
    ]
  })
]);
