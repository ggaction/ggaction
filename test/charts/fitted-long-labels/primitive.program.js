import { chart } from "../../../src/index.js";

export function createFittedLongLabelsPrimitive(rows) {
  return chart()
    .createCanvas({
      width: 680,
      height: 420,
      margin: { top: 60, right: 4, bottom: 81.5, left: 39.75 }
    })
    .createData({ values: rows })
    .createScatterPlot({
      x: { field: "market", fieldType: "nominal" },
      y: "score",
      point: { radius: 5 },
      guides: false
    })
    .createXAxis({
      ticksAndLabels: {
        labels: {
          maxWidth: 72,
          wrap: "word",
          lineHeight: 14,
          rotation: { value: -24, unit: "degrees" }
        }
      },
      title: { text: "Sales market" }
    })
    .createYAxis({ title: { text: "Account score" } })
    .createTitle({
      text: "Market account scores",
      subtitle: "Margins fitted after wrapped axis labels"
    });
}
