import { chart } from "../../../../src/ChartProgram.js";

export const lineSeriesRows = Object.freeze([
  Object.freeze({ year: "2020-01-01", value: 2, origin: "A", cylinders: 4 }),
  Object.freeze({ year: "2021-01-01", value: 10, origin: "A", cylinders: 4 }),
  Object.freeze({ year: "2020-01-01", value: 6, origin: "B", cylinders: 6 }),
  Object.freeze({ year: "2021-01-01", value: 14, origin: "B", cylinders: 6 })
]);

export function createMeanLine(values = lineSeriesRows) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "data", values })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" });
}

export function createLegendMeanLine(values = lineSeriesRows) {
  return chart()
    .createCanvas({
      width: 420,
      height: 180,
      margin: { top: 20, right: 140, bottom: 20, left: 20 }
    })
    .createData({ id: "data", values })
    .createLineMark({ id: "trends" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "value", aggregate: "mean" });
}
