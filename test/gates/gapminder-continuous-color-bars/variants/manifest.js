import { loadGapminder } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createGapminderContinuousColorBarPrimitives } from
  "../primitive.program.js";
import {
  CONTINUOUS_BAR_COUNTRIES,
  CONTINUOUS_BAR_VARIANTS
} from "../reference-values.js";

const gapminder = loadGapminder();

function baseChain(color) {
  return `chart()
  .createCanvas({
    width: 680,
    height: 380,
    margin: { top: 58, right: 125, bottom: 72, left: 72 }
  })
  .createData({ id: "gapminder", values: gapminder })
  .filterData({
    id: "recent",
    field: "year",
    range: { min: 1995, max: 2005 }
  })
  .filterData({
    id: "focus",
    field: "country",
    oneOf: ${JSON.stringify(CONTINUOUS_BAR_COUNTRIES)}
  })
  .createBarMark()
  .encodeX({ field: "country", fieldType: "nominal" })
  .encodeY({
    field: "pop",
    fieldType: "quantitative",
    aggregate: "sum",
    stack: null,
    scale: { domain: [0, 4000000000] }
  })
  ${color}
  .encodeBarWidth({ band: 0.72 })
  .createGuides({
    axes: {
      x: {
        ticksAndLabels: {
          ticks: { length: 4 },
          labels: { offset: 10, fontSize: 10 }
        },
        title: { text: "Country", offset: 56, fontSize: 12 }
      },
      y: {
        ticksAndLabels: {
          values: [0, 1000000000, 2000000000, 3000000000, 4000000000],
          ticks: { length: 4 },
          labels: { offset: 8, fontSize: 10 }
        },
        title: { text: "sum(pop), 1995–2005", offset: 56, fontSize: 12 }
      }
    },
    grid: { horizontal: {}, vertical: false },
    legend: {
      title: ${JSON.stringify(color.includes("life_expect") ? "mean(life_expect)" : "sum(pop)")},
      position: "right",
      offset: 24,
      gradient: { length: 120, thickness: 10 },
      labels: { offset: 13, fontSize: 10 },
      titleStyle: { fontSize: 10 }
    }
  })`;
}

const matching = baseChain(`.encodeColor({
    field: "pop",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  })`);

const alternate = baseChain(`.encodeColor({
    field: "life_expect",
    fieldType: "quantitative",
    aggregate: "mean",
    scale: { type: "sequential", palette: "viridis" }
  })`);

const chains = Object.freeze({
  "matching-population": `${matching}
  .createTitle({
    text: "Recent Population by Country",
    subtitle: "Bar height and color both use sum(pop), 1995–2005",
    offset: -6,
    gap: 4.8,
    titleStyle: { fontSize: 16, fontWeight: 700 },
    subtitleStyle: { fontSize: 10 }
  });`,
  "mean-life-expectancy": `${alternate}
  .createTitle({
    text: "Recent Population and Life Expectancy",
    subtitle: "Height uses sum(pop); color uses mean(life_expect), 1995–2005",
    offset: -6,
    gap: 4.8,
    titleStyle: { fontSize: 16, fontWeight: 700 },
    subtitleStyle: { fontSize: 10 }
  });`,
  "reversed-life-expectancy": `${alternate}
  .editScale({ id: "color", reverse: true })
  .createTitle({
    text: "Recent Population and Life Expectancy · Reversed",
    subtitle: "Height uses sum(pop); color uses mean(life_expect), 1995–2005",
    offset: -6,
    gap: 4.8,
    titleStyle: { fontSize: 16, fontWeight: 700 },
    subtitleStyle: { fontSize: 10 }
  });`
});

export const continuousColorBarTargetCallChains = chains;

export const visualVariants = Object.freeze(CONTINUOUS_BAR_VARIANTS.map(variant =>
  defineVisualVariant({
    chart: "gapminder-continuous-color-bars",
    variant,
    title: {
      "matching-population": "Aggregate-Inherited Population Color",
      "mean-life-expectancy": "Explicit Mean Life-Expectancy Color",
      "reversed-life-expectancy": "Reversed Continuous Bar Color"
    }[variant],
    callChain: chains[variant],
    primitive: createGapminderContinuousColorBarPrimitives(gapminder, variant),
    userFacing: undefined,
    width: 680,
    height: 380,
    colors: ["#440154", "#fde725"],
    regions: [
      Object.freeze({
        name: "bars",
        x: 72,
        y: 58,
        width: 483,
        height: 250,
        minimumInkPixels: 180
      }),
      Object.freeze({
        name: "gradient legend",
        x: 579,
        y: 78,
        width: 90,
        height: 150,
        minimumInkPixels: 80
      })
    ]
  })
));
