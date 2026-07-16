import { loadGapminder } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import {
  createGapminderBandPointPrimitives,
  createGapminderTimePrimitives
} from "../primitive.program.js";

const gapminder = loadGapminder();

export const bandPointTargetCallChain = `chart()
  .createCanvas({
    width: 456,
    height: 312,
    margin: { top: 58, right: 22, bottom: 54, left: 70 }
  })
  .createData({ values: gapminder })
  .filterData({
    id: "gapminder2005",
    field: "year",
    predicate: { op: "eq", value: 2005 }
  })
  .filterData({
    id: "selectedCountries",
    field: "country",
    oneOf: ["Chile", "Cuba", "Egypt", "Japan", "Kenya", "Peru"]
  })
  .createBarMark()
  .encodeX({
    field: "country",
    fieldType: "nominal",
    scale: {
      type: "band",
      paddingInner: 0.2,
      paddingOuter: 0.1,
      align: 0.5
    }
  })
  .encodeY({
    field: "pop",
    aggregate: "mean",
    scale: { nice: true, zero: true }
  })
  .encodeBarWidth({ band: 0.72 })
  .editBarMark({ fill: "#cbd5e1" })
  .createPointMark()
  .encodeRadius({ value: 5 })
  .editPointMark({ stroke: "white", strokeWidth: 1 })
  .createGuides({
    axes: {
      x: { scale: "x", title: { text: "Country" } },
      y: { scale: "y", title: { text: "Population" } }
    },
    grid: { horizontal: {}, vertical: false },
    legend: false
  })
  .createTitle({
    text: "Population by Country",
    subtitle: "Band slots with aligned point centers · 2005"
  });`;

export const timeTargetCallChain = `chart()
  .createCanvas({
    width: 456,
    height: 312,
    margin: { top: 58, right: 126, bottom: 54, left: 50 }
  })
  .createData({ values: gapminder })
  .filterData({
    id: "selectedCountries",
    field: "country",
    oneOf: ["Afghanistan", "China", "United States"]
  })
  .createLineMark({ strokeWidth: 3 })
  .encodeX({
    field: "year",
    fieldType: "temporal",
    scale: { type: "time", nice: true }
  })
  .encodeY({
    field: "life_expect",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "country",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Year" } },
      y: { title: { text: "Life expectancy" } }
    },
    grid: { horizontal: {}, vertical: false },
    legend: { title: "Country" }
  })
  .createTitle({
    text: "Life Expectancy over Time",
    subtitle: "UTC year positions · 1955–2005"
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "gapminder-temporal-discrete-scales",
    variant: "band-point-centers",
    title: "Band Slots and Point Centers Gate",
    callChain: bandPointTargetCallChain,
    primitive: createGapminderBandPointPrimitives(gapminder),
    width: 456,
    height: 312,
    colors: ["#cbd5e1", "#2563eb"],
    regions: [Object.freeze({
      name: "band bars and point centers",
      x: 70,
      y: 58,
      width: 364,
      height: 200,
      colors: ["#cbd5e1", "#2563eb"],
      minimumInkPixels: 240
    })]
  }),
  defineVisualVariant({
    chart: "gapminder-temporal-discrete-scales",
    variant: "utc-time-lines",
    title: "UTC Time Series Gate",
    callChain: timeTargetCallChain,
    primitive: createGapminderTimePrimitives(gapminder),
    width: 456,
    height: 312,
    colors: ["#4c78a8", "#f58518", "#e45756"],
    regions: [Object.freeze({
      name: "UTC time series",
      x: 50,
      y: 58,
      width: 280,
      height: 200,
      colors: ["#4c78a8", "#f58518", "#e45756"],
      minimumInkPixels: 160
    })]
  })
]);
