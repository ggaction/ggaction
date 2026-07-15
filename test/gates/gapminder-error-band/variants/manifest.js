import { defineVisualVariant } from "../../../support/visual-variants.js";
import { loadGapminder } from "../../../support/data.js";

import { createGapminderErrorBandPrimitives } from "../primitive.program.js";
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

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "gapminder-error-band",
    variant: "gapminder-vertical",
    title: "Gapminder Vertical Error Band",
    callChain: targetCallChain,
    primitive: createGapminderErrorBandPrimitives(loadGapminder()),
    width: ERROR_BAND_LAYOUT.width,
    height: ERROR_BAND_LAYOUT.height,
    colors: ERROR_BAND_COLORS,
    regions: [
      { name: "plot", x: 80, y: 90, width: 530, height: 320 }
    ]
  })
]);
