import { loadGapminder } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createGapminderHeatmapPrimitives } from "./primitive.program.js";
import { createGapminderLifeExpectancyHeatmap } from "./public.program.js";
import { createHeatmapReference } from "./reference-values.js";

const gapminder = loadGapminder();
const values = createHeatmapReference(gapminder);

export const gapminderHeatmapTarget = `chart()
  .createCanvas({
    width: 760,
    height: 440,
    margin: { top: 70, right: 120, bottom: 75, left: 110 }
  })
  .createData({ values: rows })
  .createRectMark()
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({ field: "country", fieldType: "nominal" })
  .encodeColor({
    field: "life_expect",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  })
  .createTextMark({
    fontSize: 10,
    fontWeight: 600,
    align: "center",
    baseline: "middle"
  })
  .encodeText({ field: "life_expect", format: ".0f" })
  .createGuides({
    axes: {
      x: { title: { text: "Year" } },
      y: { title: { text: "Country" } }
    },
    legend: { title: "Life expectancy" }
  })
  .createTitle({
    text: "Life Expectancy over Time",
    align: "center"
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "gapminder-life-expectancy-heatmap",
    variant: "discrete-cells",
    title: "Gapminder Life Expectancy Heatmap",
    callChain: gapminderHeatmapTarget,
    artifact: {
      roadmap: "roadmap3",
      phase: "phase9",
      capability: "rect-heatmap"
    },
    primitive: () => createGapminderHeatmapPrimitives(gapminder),
    userFacing: () => createGapminderLifeExpectancyHeatmap(gapminder),
    width: values.width,
    height: values.height,
    colors: ["#440154", "#21918d", "#fde725", "#f8fafc", "#0f172a"],
    regions: [
      {
        name: "heatmap-and-legend",
        x: values.bounds.left,
        y: values.bounds.top,
        width: values.width - values.bounds.left - 15,
        height: values.bounds.height,
        minimumInkPixels: 20_000,
        colors: ["#440154", "#21918d", "#fde725"]
      }
    ]
  })
]);
