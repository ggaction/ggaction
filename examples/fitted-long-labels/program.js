import { chart } from "../../src/index.js";

export const fittedLabelRows = Object.freeze([
  Object.freeze({ market: "North America Enterprise", score: 72 }),
  Object.freeze({ market: "European Mid Market", score: 64 }),
  Object.freeze({ market: "Asia Pacific Consumer", score: 81 }),
  Object.freeze({ market: "Latin America Growth", score: 58 })
]);

export function createFittedLongLabels(rows = fittedLabelRows) {
  return chart()
    .createCanvas({ width: 680, height: 420, margin: 130 })
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
    })
    .fitCanvas({ padding: 4 });
}
