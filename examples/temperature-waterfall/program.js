import { chart } from "../../src/index.js";

// NASA GISTEMP annual (J-D) anomalies: the 2013 level plus each later year's change.
export function createTemperatureWaterfall(temperatures) {
  const years = temperatures
    .filter(row => row.Year >= 2013 && row.Year <= 2022 && Number.isFinite(row["J-D"]))
    .map(row => ({ year: row.Year, anomaly: row["J-D"] }));
  const steps = years.map((row, index) => ({
    id: String(row.year),
    stage: index === 0 ? "2013 level" : String(row.year),
    role: "delta",
    value: index === 0 ? row.anomaly : Number((row.anomaly - years[index - 1].anomaly).toFixed(2))
  }));
  steps.push({ id: "total", stage: "2022 level", role: "total" });

  return chart()
    .createCanvas({ width: 900, height: 460, margin: { top: 80, right: 40, bottom: 60, left: 70 } })
    .createData({ id: "steps", keyField: "id", values: steps })
    .createWaterfallPlot({
      x: "stage",
      role: "role",
      value: "value",
      width: { band: 0.65 },
      // Leave room above the highest running total for its label.
      yScale: { domain: [0, 1.2] },
      labels: { content: "value", format: ".2f", fontSize: 12 },
      guides: {
        axes: { x: { title: false }, y: { title: { text: "Temperature anomaly (°C)" } } },
        legend: false,
        grid: { horizontal: true, vertical: false }
      }
    })
    .createTitle({
      text: "How the global temperature anomaly moved, 2013–2022",
      subtitle: "Green bars warm the running total, red bars cool it · NASA GISTEMP annual means"
    });
}
