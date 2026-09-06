import { chart } from "../../../src/index.js";

export function createDarkThemeScatterplotPrimitive(rows) {
  return chart()
    .createCanvas({
      width: 640,
      height: 400,
      margin: { top: 72, right: 170, bottom: 60, left: 70 }
    })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "value" })
    .encodeColor({ field: "group" })
    .encodeRadius({ value: 5 })
    .createGuides({
      axes: {
        x: { title: { text: "Category" } },
        y: { title: { text: "Value" } }
      },
      legend: { channels: ["color"] }
    })
    .createTitle({
      text: "Quarterly observations",
      subtitle: "Dark program theme"
    })
    .editCanvas({ background: "#0f172a" })
    .editXAxisLine({ color: "#cbd5e1" })
    .editXAxisTicks({ color: "#94a3b8" })
    .editXAxisLabels({ color: "#e2e8f0" })
    .editXAxisTitle({ color: "#f1f5f9" })
    .editYAxisLine({ color: "#cbd5e1" })
    .editYAxisTicks({ color: "#94a3b8" })
    .editYAxisLabels({ color: "#e2e8f0" })
    .editYAxisTitle({ color: "#f1f5f9" })
    .editHorizontalGrid({ color: "#334155" })
    .editLegendLabels({ color: "#e2e8f0" })
    .editLegendTitle({ color: "#f8fafc" })
    .editTitle({
      titleStyle: { color: "#f8fafc" },
      subtitleStyle: { color: "#94a3b8" }
    });
}
