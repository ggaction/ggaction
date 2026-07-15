import { defineVisualVariant } from "../../../support/visual-variants.js";
import { loadCars, loadGapminder } from "../../../support/data.js";

import { createCarsHorizontalErrorBandPrimitives } from
  "../cars-horizontal.primitive.program.js";
import { createGapminderErrorBandPrimitives } from "../primitive.program.js";
import {
  createCarsHorizontalErrorBand,
  createGapminderErrorBand
} from "../public.program.js";
import {
  CARS_HORIZONTAL_LAYOUT,
  CARS_HORIZONTAL_STYLE
} from "../cars-horizontal.reference-values.js";
import {
  ERROR_BAND_COLORS,
  ERROR_BAND_LAYOUT
} from "../reference-values.js";

const targetCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 90, right: 150, bottom: 70, left: 80 }
  })
  .createData({ values: gapminder })
  .createErrorBand({
    x: { field: "year", fieldType: "temporal" },
    y: { field: "life_expect" },
    groupBy: "cluster"
  })
  .encodeColor({
    target: "errorBand",
    field: "cluster",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  })
  .createGuides()
  .createTitle({
    text: "Life Expectancy by Cluster",
    subtitle: "Mean and 95% confidence interval"
  });`;

const horizontalTargetCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 90, right: 50, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createErrorBand({
    x: { field: "Acceleration", extent: "ci" },
    y: { field: "Year", fieldType: "temporal" },
    boundaries: { stroke: "#355f8a", strokeWidth: 1.5 }
  })
  .createGuides()
  .createTitle({
    text: "Acceleration over Time",
    subtitle: "Mean and 95% confidence interval across cars"
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "gapminder-error-band",
    variant: "gapminder-vertical",
    title: "Gapminder Vertical Error Band",
    callChain: targetCallChain,
    primitive: createGapminderErrorBandPrimitives(loadGapminder()),
    userFacing: createGapminderErrorBand(loadGapminder()),
    width: ERROR_BAND_LAYOUT.width,
    height: ERROR_BAND_LAYOUT.height,
    colors: ERROR_BAND_COLORS,
    regions: [
      { name: "plot", x: 80, y: 90, width: 530, height: 320 }
    ]
  }),
  defineVisualVariant({
    chart: "gapminder-error-band",
    variant: "cars-horizontal",
    title: "Cars Horizontal Error Band",
    callChain: horizontalTargetCallChain,
    primitive: createCarsHorizontalErrorBandPrimitives(loadCars()),
    userFacing: createCarsHorizontalErrorBand(loadCars()),
    width: CARS_HORIZONTAL_LAYOUT.width,
    height: CARS_HORIZONTAL_LAYOUT.height,
    colors: [CARS_HORIZONTAL_STYLE.boundaryStroke],
    regions: [
      { name: "plot", x: 80, y: 90, width: 630, height: 320 }
    ]
  })
]);
