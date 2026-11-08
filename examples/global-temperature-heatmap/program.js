import { chart } from "../../src/index.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// NASA GISTEMP global monthly anomalies relative to 1951–1980.
export function createGlobalTemperatureHeatmap(temperatures) {
  const cells = temperatures.flatMap(row => MONTHS.map(month => ({
    year: row.Year,
    month,
    anomaly: row[month]
  }))).filter(cell => Number.isFinite(cell.anomaly));

  return chart()
    .createCanvas({
      width: 960,
      height: 360,
      margin: { top: 80, right: 140, bottom: 50, left: 60 }
    })
    .createData({ id: "temperatures", values: cells })
    .createHeatmap({
      id: "anomalies",
      x: { field: "year", fieldType: "ordinal" },
      y: { field: "month", fieldType: "ordinal", scale: { domain: MONTHS } },
      color: {
        field: "anomaly",
        fieldType: "quantitative",
        // A symmetric domain keeps zero anomaly at the white center.
        scale: { type: "sequential", domain: [-1.4, 1.4], range: ["#2166ac", "#f7f7f7", "#b2182b"] }
      },
      guides: {
        axes: {
          x: {
            title: { text: "Year" },
            ticksAndLabels: { values: [1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020] }
          },
          y: { title: false }
        },
        legend: { title: "Anomaly (°C)" }
      }
    })
    .createTitle({
      text: "Global surface temperature, 1880–2023",
      subtitle: "Monthly anomaly from the 1951–1980 mean · NASA GISTEMP"
    });
}
