import { loadGapminder } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { LABEL_LAYOUT } from "./fixture.js";
import { createGapminderCountryLabelPrimitives } from "./primitive.program.js";

const gapminder = loadGapminder();

export const targetCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 520,
    margin: { top: 88, right: 38, bottom: 72, left: 76 }
  })
  .createData({ id: "countries2005", values: rows })
  .createPointMark({
    id: "countries",
    data: "countries2005",
    fill: "#2563eb",
    stroke: "#ffffff",
    strokeWidth: 0.8
  })
  .encodeX({
    target: "countries",
    field: "fertility",
    fieldType: "quantitative",
    scale: { domain: [1.2, 2.15], zero: false }
  })
  .encodeY({
    target: "countries",
    field: "life_expect",
    fieldType: "quantitative",
    scale: { domain: [77.2, 83], zero: false }
  })
  .createTextMark({
    id: "countryLabels",
    fontSize: 11,
    align: "left",
    baseline: "middle",
    dx: 7
  })
  .encodeText({ target: "countryLabels", field: "country" })
  .layoutLabels({
    target: "countryLabels",
    axis: "both",
    padding: 3,
    maxDisplacement: 64,
    bounds: "plot",
    leader: { stroke: "#94a3b8", strokeWidth: 0.8, opacity: 0.9 }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Fertility" } },
      y: { title: { text: "Life expectancy" } }
    },
    grid: { horizontal: true, vertical: true },
    legend: false
  })
  .createTitle({
    text: "Fertility and Life Expectancy",
    subtitle: "Selected countries in 2005"
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "gapminder-country-labels",
    variant: "collision-aware",
    title: "Fertility and Life Expectancy",
    callChain: targetCallChain,
    artifact: { scope: "review" },
    primitive: () => createGapminderCountryLabelPrimitives(gapminder),
    width: LABEL_LAYOUT.width,
    height: LABEL_LAYOUT.height,
    colors: ["#2563eb", "#0f172a"],
    regions: [{
      name: "country-points-labels-and-leaders",
      x: LABEL_LAYOUT.plot.left,
      y: LABEL_LAYOUT.plot.top,
      width: LABEL_LAYOUT.plot.right - LABEL_LAYOUT.plot.left,
      height: LABEL_LAYOUT.plot.bottom - LABEL_LAYOUT.plot.top,
      minimumInkPixels: 900
    }]
  })
]);
