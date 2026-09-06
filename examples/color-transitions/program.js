import { chart } from "../../src/index.js";
export const layout = { width: 1000, height: 700, margin: 150 };
export const rows = [-2, 0, 4, 8].map((value, x) => ({ x, value, category: String(x) }));
export const color = { field: "value", fieldType: "quantitative", scale: {
  id: "colors", type: "sequential", domain: [-2, 8], range: ["blue", "white", "red"], midpoint: 0
} };
export const transition = { id: "colors", type: "quantize", domain: [-2, 8], range: ["blue", "red"] };
export function createPointTransition() {
  return chart().createCanvas(layout).createData({ id: "data", values: rows })
    .createScatterPlot({ id: "m", x: "x", y: "value", color })
    .editScale(transition);
}
export function createBarTransition() {
  return chart().createCanvas(layout).createData({ id: "data", values: rows })
    .createBarPlot({ id: "m", x: "category", y: { field: "value", aggregate: "sum" }, color })
    .editScale(transition);
}
