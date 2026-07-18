import { chart } from "../../src/index.js";

export const HEATMAP_COUNTRIES = Object.freeze([
  "Afghanistan",
  "Brazil",
  "China",
  "India",
  "Japan",
  "United States"
]);

export const HEATMAP_YEARS = Object.freeze([
  1955, 1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005
]);

export function selectHeatmapRows(gapminder) {
  if (!Array.isArray(gapminder)) {
    throw new TypeError("gapminder must be an array.");
  }
  return gapminder.flatMap(row =>
    HEATMAP_COUNTRIES.includes(row?.country) &&
    HEATMAP_YEARS.includes(row?.year) &&
    Number.isFinite(row?.life_expect)
      ? [{
          country: row.country,
          year: row.year,
          life_expect: row.life_expect
        }]
      : []
  );
}

export function createGapminderLifeExpectancyHeatmap(gapminder) {
  const rows = selectHeatmapRows(gapminder);
  return chart()
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
    });
}
