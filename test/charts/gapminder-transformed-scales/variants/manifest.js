import { loadGapminder } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createGapminderTransformedScalePrimitives } from "../primitive.program.js";
import { createGapminderTransformedScaleScatterplot } from
  "../../../../examples/gapminder-transformed-scales/program.js";

const gapminder = loadGapminder();

export const transformedScaleTargetCallChain = `chart()
  .createCanvas({
    width: 456,
    height: 312,
    margin: { top: 57.6, right: 90, bottom: 43.2, left: 50.4 }
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
      x: {
        ticksAndLabels: {
          ticks: { length: 3.6, color: "#334155" },
          labels: { offset: 8.4, fontSize: 11 }
        },
        title: { text: "Population", offset: 31.2 }
      },
      y: {
        ticksAndLabels: {
          ticks: { length: 3.6, color: "#334155" },
          labels: { offset: 7.2, fontSize: 11 }
        },
        title: { text: "Fertility", offset: 36 }
      }
    },
    grid: { horizontal: {}, vertical: {} },
    legend: {
      title: "Life expectancy",
      offset: 21.6,
      gradient: { length: 132, thickness: 9.6 },
      labels: { offset: 7.2, fontSize: 11 },
      titleStyle: { fontSize: 10 }
    }
  })
  .createTitle({
    text: "Population, Fertility, and Life Expectancy",
    subtitle: "Gapminder countries in 2005 · log population scale",
    offset: -6,
    gap: 4.8,
    titleStyle: { fontSize: 16, fontWeight: 700 },
    subtitleStyle: { fontSize: 10 }
  });`;

export const visualVariants = Object.freeze([defineVisualVariant({
  chart: "gapminder-transformed-scales",
  variant: "gapminder-2005-log-sqrt",
  title: "Gapminder Log and Sqrt Scale Gate",
  callChain: transformedScaleTargetCallChain,
  primitive: createGapminderTransformedScalePrimitives(gapminder),
  userFacing: createGapminderTransformedScaleScatterplot(gapminder),
  width: 456,
  height: 312,
  colors: ["#450457", "#f8e722"],
  regions: [
    Object.freeze({
      name: "plot",
      x: 50.4,
      y: 57.6,
      width: 315.6,
      height: 211.2,
      minimumInkPixels: 90
    }),
    Object.freeze({
      name: "gradient legend",
      x: 382.8,
      y: 70.8,
      width: 66,
      height: 170,
      colors: ["#450457", "#f8e722"],
      minimumInkPixels: 75
    })
  ]
})]);
