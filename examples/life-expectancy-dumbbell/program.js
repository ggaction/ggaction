import { chart } from "../../src/index.js";

// Life expectancy in 1955 and 2005 for the twenty largest Gapminder countries.
export function createLifeExpectancyDumbbell(gapminder) {
  const year = (country, value) => gapminder.find(row => row.country === country && row.year === value);
  const largest = gapminder.filter(row => row.year === 2005)
    .sort((a, b) => b.pop - a.pop).slice(0, 20).map(row => row.country);
  const rows = largest.map(country => ({
    country,
    before: year(country, 1955).life_expect,
    after: year(country, 2005).life_expect
  })).sort((a, b) => (b.after - b.before) - (a.after - a.before));

  return chart()
    .createCanvas({ width: 900, height: 620, margin: { top: 80, right: 40, bottom: 60, left: 130 } })
    .createData({ id: "countries", keyField: "country", values: rows })
    .createDumbbellPlot({
      category: { field: "country", scale: { domain: rows.map(row => row.country) } },
      start: { field: "before", scale: { zero: false, domain: [25, 85] } },
      end: "after",
      orientation: "horizontal",
      startPoint: { fill: "#94a3b8", radius: 5 },
      endPoint: { fill: "#0d9488", radius: 5 },
      connector: { stroke: "#cbd5e1", strokeWidth: 3 },
      guides: {
        axes: { x: { title: { text: "Life expectancy (years)" } }, y: { title: false } },
        grid: { horizontal: false, vertical: true }
      }
    })
    .createTitle({
      text: "Life expectancy gained between 1955 (gray) and 2005 (teal)",
      subtitle: "Twenty most populous Gapminder countries · ordered by years gained"
    });
}
