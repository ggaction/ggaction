import { loadGapminder } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createGapminderTransformedScalePrimitives } from "../primitive.program.js";

const gapminder = loadGapminder();

export const transformedScaleTargetCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 520,
    margin: { top: 96, right: 150, bottom: 72, left: 84 }
  })
  .createData({ values: gapminder })
  .filterData({
    id: "gapminder2005",
    field: "year",
    predicate: { op: "eq", value: 2005 }
  })
  .createPointMark()
  .encodeX({
    field: "pop",
    fieldType: "quantitative",
    scale: { type: "log", base: 10, nice: true }
  })
  .encodeY({
    field: "fertility",
    fieldType: "quantitative",
    scale: { type: "sqrt", nice: true, zero: false }
  })
  .encodeColor({
    field: "life_expect",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  })
  .encodeRadius({ value: 4 })
  .editPointMark({
    opacity: 0.72,
    stroke: "#ffffff",
    strokeWidth: 0.6
  })
  .createGuides({
    axes: {
      x: { title: { text: "Population" } },
      y: { title: { text: "Fertility" } }
    },
    grid: { horizontal: {}, vertical: {} },
    legend: { title: "Life expectancy" }
  })
  .createTitle({
    text: "Population, Fertility, and Life Expectancy",
    subtitle: "Gapminder countries in 2005 · log population scale"
  });`;

export const visualVariants = Object.freeze([defineVisualVariant({
  chart: "gapminder-transformed-scales",
  variant: "gapminder-2005-log-sqrt",
  title: "Gapminder Log and Sqrt Scale Gate",
  callChain: transformedScaleTargetCallChain,
  primitive: createGapminderTransformedScalePrimitives(gapminder),
  width: 760,
  height: 520,
  colors: ["#440154", "#fde725"],
  regions: [
    Object.freeze({
      name: "plot",
      x: 84,
      y: 96,
      width: 526,
      height: 352,
      minimumInkPixels: 180
    }),
    Object.freeze({
      name: "gradient legend",
      x: 638,
      y: 118,
      width: 110,
      height: 270,
      colors: ["#440154", "#fde725"],
      minimumInkPixels: 150
    })
  ]
})]);
