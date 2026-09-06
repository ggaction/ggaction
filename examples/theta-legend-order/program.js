import { chart } from "../../src/index.js";

export const layout = Object.freeze({ width: 1000, height: 700, margin: 150 });
export const rows = Object.freeze([
  Object.freeze({ category: "A", value: 2 }),
  Object.freeze({ category: "B", value: 3 }),
  Object.freeze({ category: "C", value: 4 })
]);
export function createLinkedThetaLegend() {
  return chart().createCanvas(layout).createData({ id: "source", values: rows })
    .createPiePlot({ id: "pie", category: "category", value: "value", aggregate: "sum" })
    .orderCategories({ target: "pie", channel: "theta", values: ["C", "A"] })
    .editLegend({ target: "pie", order: { channel: "theta" } });
}
export function createIndependentLegendOrder() {
  return createLinkedThetaLegend().editLegend({ target: "pie", order: { values: ["B"] } });
}
