import { chart } from "../../src/index.js";

// Cumulative share of cars at or below each fuel economy, by region of origin.
export function createCarsMpgEcdf(cars) {
  const measured = cars.filter(car => Number.isFinite(car.Miles_per_Gallon));

  return chart()
    .createCanvas({ width: 900, height: 460, margin: { top: 80, right: 140, bottom: 60, left: 70 } })
    .createData({ id: "cars", values: measured })
    .createECDFPlot({
      field: "Miles_per_Gallon",
      groupBy: "Origin",
      color: { field: "Origin", scale: { domain: ["USA", "Europe", "Japan"], range: ["#2563eb", "#f97316", "#dc2626"] } },
      line: { strokeWidth: 2.5 },
      guides: {
        axes: { x: { title: { text: "Miles per gallon" } }, y: { title: { text: "Share of cars at or below" } } },
        legend: { title: "Origin" },
        grid: { horizontal: true, vertical: true }
      }
    })
    .createTitle({
      text: "Half of American cars got under 19 miles per gallon",
      subtitle: "Empirical cumulative distribution of 398 cars, 1970–1982"
    });
}
