import { chart } from "../../src/index.js";

// Gapminder's six regional clusters, in cluster-number order.
export const REGIONS = ["South Asia", "Europe & Central Asia", "Sub-Saharan Africa", "Americas",
  "East Asia & Pacific", "Middle East & North Africa"];

export function gapminderCountries(gapminder, year) {
  return gapminder
    .filter(row => row.year === year)
    .map(row => ({ ...row, region: REGIONS[row.cluster] }));
}

// Fixed domains keep the axes still while the data changes year by year.
export const bubbleOptions = {
  id: "bubbles",
  x: { field: "fertility", scale: { domain: [0, 9], nice: false } },
  y: { field: "life_expect", scale: { domain: [20, 85], nice: false } },
  color: { field: "region", scale: { domain: REGIONS } },
  size: { field: "pop", scale: { domain: [0, 1.4e9], range: [8, 1600] } },
  point: { opacity: 0.8, stroke: "#ffffff", strokeWidth: 0.6 },
  guides: {
    axes: {
      x: { title: { text: "Births per woman" } },
      y: { title: { text: "Life expectancy (years)" } }
    },
    legend: { channels: ["color"], title: "Region" }
  }
};

export function createGapminderBubbles(gapminder, year = 2005) {
  return chart()
    .createCanvas({ width: 820, height: 500, margin: { top: 70, right: 220, bottom: 60, left: 70 } })
    .createData({ id: "countries", keyField: "country", values: gapminderCountries(gapminder, year) })
    .createScatterPlot(bubbleOptions)
    .createTitle({ text: `Health and family size, ${year}`, subtitle: "Bubble area is population · 62 Gapminder countries" });
}

// One program per year. Each revision names the dataset it replaces, so the
// rows keep their country keys and the bubbles move instead of fading.
export function createGapminderBubbleYears(gapminder) {
  const years = [...new Set(gapminder.map(row => row.year))].sort((a, b) => a - b);
  const programs = [createGapminderBubbles(gapminder, years[0])];
  for (const [index, year] of years.slice(1).entries()) {
    programs.push(programs.at(-1)
      .reviseData({
        source: index === 0 ? "countries" : `countries-${years[index]}`,
        id: `countries-${year}`,
        values: gapminderCountries(gapminder, year)
      })
      .editTitle({ text: `Health and family size, ${year}` }));
  }
  return programs;
}
