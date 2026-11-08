import { chart } from "../../src/index.js";

// One row per Gapminder country: 2005 values plus its 1955–2005 history.
export function createGapminderCountryTable(gapminder) {
  const histories = new Map();
  for (const row of gapminder) {
    if (!histories.has(row.country)) histories.set(row.country, []);
    histories.get(row.country).push({ year: row.year, lifeExpectancy: row.life_expect });
  }
  const countries = [...histories].map(([country, history]) => {
    history.sort((a, b) => a.year - b.year);
    const latest = gapminder.find(row => row.country === country && row.year === 2005);
    return {
      country,
      lifeExpectancy: latest.life_expect,
      fertility: latest.fertility,
      populationMillions: latest.pop / 1e6,
      history
    };
  });

  return chart()
    .createCanvas({ width: 960, height: 700, margin: { top: 80, right: 30, bottom: 30, left: 30 } })
    .createData({ id: "countries", keyField: "country", values: countries })
    .createTablePlot({
      rowLimit: 12,
      rowHeight: 36,
      padding: 7,
      sortBy: [{ field: "populationMillions", order: "descending" }],
      columns: [
        { field: "country", label: "Country", width: 170, footer: "count" },
        { field: "populationMillions", label: "Population (M)", width: 190, cell: "bar", format: ".0f",
          align: "right", footer: { op: "sum", format: ".0f" } },
        { field: "lifeExpectancy", label: "Life expectancy", width: 170,
          cell: { type: "bar", domain: [0, 90] }, format: ".1f", align: "right" },
        { field: "fertility", label: "Births per woman", width: 140, format: ".2f", align: "right" },
        { field: "history", label: "Life expectancy, 1955–2005", width: 230,
          cell: { type: "sparkline", x: "year", y: "lifeExpectancy", xDomain: [1955, 2005], yDomain: [30, 85],
            resolveY: "shared" } }
      ],
      labels: { fontSize: 12 },
      cells: { stroke: "#e2e8f0", strokeWidth: 0.6 },
      bars: { fill: "#bfdbfe" },
      sparklines: { stroke: "#0d9488", strokeWidth: 2 },
      headerStyle: { fill: "#f1f5f9", color: "#0f172a" },
      footerStyle: { fill: "#eff6ff", color: "#0f172a" }
    })
    .createTitle({
      text: "The twelve most populous countries in 2005",
      subtitle: "Bars and sparklines share one scale per column · footer totals all 62 countries"
    });
}
