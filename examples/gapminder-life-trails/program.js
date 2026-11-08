import { chart } from "../../src/index.js";

const LARGEST = ["China", "India", "United States", "Indonesia", "Brazil", "Pakistan", "Bangladesh", "Nigeria"];

// Gapminder life expectancy for the eight most populous countries in 2005.
export function createGapminderLifeTrails(gapminder) {
  const rows = gapminder
    .filter(row => LARGEST.includes(row.country))
    .map(row => ({
      id: `${row.country}/${row.year}`,
      country: row.country,
      year: row.year,
      lifeExpectancy: row.life_expect,
      // Ribbon width in pixels grows with the square root of population.
      width: 1 + 0.6 * Math.sqrt(row.pop / 1e6)
    }));

  return chart()
    .createCanvas({ width: 900, height: 520, margin: { top: 80, right: 160, bottom: 60, left: 70 } })
    .createData({ id: "trajectories", keyField: "id", values: rows })
    .createTrailPlot({
      x: { field: "year", scale: { zero: false, nice: false } },
      y: { field: "lifeExpectancy", scale: { zero: false, domain: [20, 80] } },
      width: "width",
      groupBy: "country",
      color: {
        field: "country",
        scale: {
          domain: LARGEST,
          range: ["#dc2626", "#ea580c", "#2563eb", "#16a34a", "#0d9488", "#7c3aed", "#db2777", "#ca8a04"]
        }
      },
      body: { opacity: 0.75 },
      guides: {
        axes: {
          x: { title: { text: "Year" }, ticksAndLabels: { labels: { format: ".0f" } } },
          y: { title: { text: "Life expectancy (years)" } }
        },
        legend: { title: "Country" },
        grid: { horizontal: true, vertical: false }
      }
    })
    .createTitle({
      text: "Fifty years of longer lives",
      subtitle: "Life expectancy 1955–2005 · ribbon width follows population · China dips during the 1959–61 famine"
    });
}
