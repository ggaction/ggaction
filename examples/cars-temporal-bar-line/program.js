import { chart } from "../../src/index.js";

export function createCarsTemporalBarLine(rows) {
  return chart()
    .createCanvas({
      width: 720,
      height: 440,
      margin: { top: 64, right: 50, bottom: 64, left: 72 }
    })
    .createData({ values: rows })
    .createBarMark({ id: "bars", fill: "#bfdbfe" })
    .encodeX({ field: "Year", fieldType: "temporal" })
    .encodeY({ field: "Acceleration", aggregate: "mean" })
    .createLineMark({ id: "trend", stroke: "#1d4ed8", strokeWidth: 3 })
    .createGuides({
      axes: {
        x: { title: { text: "Year" } },
        y: { title: { text: "Mean acceleration" } }
      },
      legend: false
    })
    .createTitle({
      text: "Average Acceleration by Model Year",
      subtitle: "Shared temporal scale for bars and trend",
      align: "center",
      titleStyle: { color: "#334155", fontSize: 18, fontWeight: 700 },
      subtitleStyle: { fontSize: 12 }
    });
}
