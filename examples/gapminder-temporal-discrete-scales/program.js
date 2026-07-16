import { chart } from "../../src/index.js";

export function createGapminderBandPointChart(gapminder) {
  return chart()
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
    .editPointMark({ fill: "#2563eb", stroke: "white", strokeWidth: 1 })
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
      subtitle: "Band slots with aligned point centers · 2005",
      offset: -7,
      gap: 7,
      titleStyle: { fontSize: 18, fontWeight: 700 },
      subtitleStyle: { fontSize: 12 }
    });
}

export function createGapminderTimeChart(gapminder) {
  return chart()
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
      subtitle: "UTC year positions · 1955–2005",
      offset: -7,
      gap: 7,
      titleStyle: { fontSize: 18, fontWeight: 700 },
      subtitleStyle: { fontSize: 12 }
    });
}
