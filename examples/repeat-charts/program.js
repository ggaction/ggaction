import { chart } from "../../src/index.js";

export const repeatChartRows = Object.freeze([
  Object.freeze({ speed: 18, quality: 72, cost: 240, score: 22, group: "A" }),
  Object.freeze({ speed: 26, quality: 64, cost: 180, score: 35, group: "B" }),
  Object.freeze({ speed: 32, quality: 88, cost: 320, score: 48, group: "A" }),
  Object.freeze({ speed: 41, quality: 79, cost: 270, score: 61, group: "B" })
]);

export function createRepeatChartsExample(values = repeatChartRows) {
  return chart()
    .createCanvas({
      width: 220,
      height: 150,
      margin: { top: 32, right: 72, bottom: 26, left: 30 }
    })
    .createData({ id: "products", values })
    .createPointMark({ id: "product", data: "products" })
    .encodeX({ target: "product", field: "speed", scale: { id: "metricScale" } })
    .encodeY({ target: "product", field: "score", scale: { id: "scoreScale" } })
    .encodeColor({
      target: "product",
      field: "group",
      fieldType: "nominal",
      scale: { id: "groupScale" }
    })
    .encodeRadius({ target: "product", value: 4.5 })
    .createLegend({ channels: ["color"], position: "right" })
    .repeatCharts({
      id: "metrics",
      target: "product",
      channel: "x",
      fields: ["speed", "quality", "cost"],
      gap: 14,
      guides: { legend: "shared" }
    });
}
