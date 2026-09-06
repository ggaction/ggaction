import { chart } from "../../src/index.js";

export const facetGridRows = Object.freeze([
  Object.freeze({ region: "North", period: "Q1", value: 18, target: 20 }),
  Object.freeze({ region: "North", period: "Q2", value: 27, target: 30 }),
  Object.freeze({ region: "North", period: "Q3", value: 36, target: 40 }),
  Object.freeze({ region: "South", period: "Q1", value: 24, target: 20 }),
  Object.freeze({ region: "South", period: "Q3", value: 42, target: 40 })
]);

export function createFacetGridExample(values = facetGridRows) {
  return chart()
    .createCanvas({
      width: 160,
      height: 130,
      margin: { top: 30, right: 20, bottom: 22, left: 26 }
    })
    .createData({ id: "metrics", values })
    .createPointMark({ id: "result", data: "metrics", fill: "#2563eb" })
    .encodeX({ target: "result", field: "value", scale: { id: "valueScale" } })
    .encodeY({ target: "result", field: "target", scale: { id: "targetScale" } })
    .encodeRadius({ target: "result", value: 5 })
    .facetGrid({
      id: "matrix",
      rows: { field: "region", values: ["North", "South"] },
      columns: { field: "period", values: ["Q1", "Q2", "Q3"] },
      combinations: "full",
      gap: 12
    });
}
