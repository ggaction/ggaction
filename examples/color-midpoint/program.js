import { chart } from "../../src/index.js";
export const layout = { width: 1000, height: 700, margin: 150 };
export const rows = [-2, 0, 4, 8].map((value, x) => ({ x, value }));
export const plotOptions = {
  id: "m", x: "x", y: "value",
  point: { radius: 7, stroke: "#334155", strokeWidth: 1 },
  color: { field: "value", fieldType: "quantitative", scale: {
    id: "colors", type: "sequential", domain: [-2, 8],
    range: ["blue", "white", "red"], midpoint: 0
  } },
  guides: { legend: { count: 3 } }
};
export function createMidpoint() {
  return chart().createCanvas(layout).createData({ id: "data", values: rows })
    .createScatterPlot(plotOptions);
}
export function createClearedMidpoint() {
  return createMidpoint().editScale({ id: "colors", midpoint: "auto" });
}
