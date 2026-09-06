import { chart } from "../../src/index.js";

export const endpointRows = Object.freeze([
  Object.freeze({ category: "A", value: 4, before: 2, after: 5 }),
  Object.freeze({ category: "B", value: -1, before: 3, after: -1 }),
  Object.freeze({ category: "C", value: 2, before: 2, after: 2 })
]);

export function createDotPlotExample(values = endpointRows) {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 50 })
    .createData({ id: "data", values })
    .createDotPlot({ id: "dot", category: "category", value: "value", guides: false });
}
