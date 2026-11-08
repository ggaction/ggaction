import { chart } from "../../src/index.js";

// Births per woman in 2005, highest fifteen Gapminder countries.
export function createFertilityLollipop(gapminder) {
  const rows = gapminder.filter(row => row.year === 2005)
    .sort((a, b) => b.fertility - a.fertility).slice(0, 15)
    .map(row => ({ country: row.country, fertility: row.fertility }));

  return chart()
    .createCanvas({ width: 900, height: 520, margin: { top: 80, right: 60, bottom: 60, left: 130 } })
    .createData({ id: "countries", keyField: "country", values: rows })
    .createLollipopPlot({
      category: { field: "country", scale: { domain: rows.map(row => row.country) } },
      value: { field: "fertility", scale: { domain: [0, 8] } },
      baseline: 0,
      orientation: "horizontal",
      point: { fill: "#7c3aed", radius: 6 },
      stem: { stroke: "#c4b5fd", strokeWidth: 2 },
      guides: {
        axes: { x: { title: { text: "Births per woman" } }, y: { title: false } },
        grid: { horizontal: false, vertical: true }
      }
    })
    .createTitle({
      text: "Highest fertility rates in 2005",
      subtitle: "Fifteen of 62 Gapminder countries · replacement level is about 2.1"
    });
}
