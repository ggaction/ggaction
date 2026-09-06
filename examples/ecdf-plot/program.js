import { chart } from "../../src/index.js";

export const ecdfRows = Object.freeze([
  Object.freeze({ group: "A", value: 1, weight: 2 }),
  Object.freeze({ group: "B", value: 2, weight: 1 }),
  Object.freeze({ group: "A", value: 3, weight: 1 }),
  Object.freeze({ group: "B", value: 4, weight: 3 })
]);

export function createECDFExample(values = ecdfRows) {
  return chart()
    .createCanvas({ width: 520, height: 340, margin: 55 })
    .createData({ id: "data", values })
    .createECDFPlot({
      id: "ecdf",
      field: "value",
      groupBy: "group",
      weight: "weight",
      color: "group",
      labels: { dx: 10 },
      guides: false
    });
}
