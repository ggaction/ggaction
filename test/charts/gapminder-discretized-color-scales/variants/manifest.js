import { loadGapminder } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createGapminderDiscretizedColorPrimitives } from "../primitive.program.js";
import {
  DISCRETIZED_COLORS,
  DISCRETIZED_COLOR_TYPES
} from "../reference-values.js";
import { GAPMINDER_DISCRETIZED_COLOR_BUILDERS } from
  "../../../../examples/gapminder-discretized-color-scales/program.js";

const gapminder = loadGapminder();
const COLOR_RANGE = JSON.stringify(DISCRETIZED_COLORS);

function targetCallChain(type) {
  const domain = type === "threshold"
    ? "\n      domain: [60, 70, 75, 80],"
    : "";
  const title = {
    quantize: "Life Expectancy: Equal Intervals",
    quantile: "Life Expectancy: Equal Counts",
    threshold: "Life Expectancy: Fixed Thresholds"
  }[type];
  return `chart()
  .createCanvas({
    width: 480,
    height: 312,
    margin: { top: 57.6, right: 114, bottom: 43.2, left: 50.4 }
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
    scale: {
      type: "${type}",${domain}
      range: ${COLOR_RANGE}
    }
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
      position: "right",
      direction: "vertical",
      offset: 30,
      itemGap: 28,
      symbol: { width: 14, height: 12, stroke: "white", strokeWidth: 0.5 },
      labels: { offset: 8, fontSize: 10 },
      titleStyle: { fontSize: 10 }
    }
  })
  .createTitle({
    text: "${title}",
    subtitle: "Gapminder countries in 2005 · ${type} color classes",
    offset: -6,
    gap: 4.8,
    titleStyle: { fontSize: 16, fontWeight: 700 },
    subtitleStyle: { fontSize: 10 }
  });`;
}

export const discretizedColorTargetCallChains = Object.freeze(
  Object.fromEntries(DISCRETIZED_COLOR_TYPES.map(type => [type, targetCallChain(type)]))
);

export const visualVariants = Object.freeze(DISCRETIZED_COLOR_TYPES.map(type =>
  defineVisualVariant({
    chart: "gapminder-discretized-color-scales",
    variant: `${type}-life-expectancy`,
    title: `Gapminder ${type[0].toUpperCase()}${type.slice(1)} Color`,
    callChain: discretizedColorTargetCallChains[type],
    primitive: () => createGapminderDiscretizedColorPrimitives(gapminder, type),
    userFacing: () => GAPMINDER_DISCRETIZED_COLOR_BUILDERS[type](gapminder),
    width: 480,
    height: 312,
    colors: DISCRETIZED_COLORS,
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
        name: "interval legend",
        x: 390,
        y: 70,
        width: 86,
        height: 166,
        colors: DISCRETIZED_COLORS,
        minimumInkPixels: 70
      })
    ]
  })
));
