import { chart } from "../../src/index.js";
export const layout = { width: 1000, height: 700, margin: 150 };
export const rows = [{ category: "A", value: 2 }, { category: "B", value: 3 }, { category: "C", value: 4 }];
function base() { return chart().createCanvas(layout).createData({ id: "source", values: rows }); }
export function createRoseDisk() {
  return base().createRosePlot({ id: "sectors", category: "category", value: "value", aggregate: "sum", radiusScale: { range: [0, 140] } });
}
export function createRoseHole() {
  return base().createRosePlot({ id: "sectors", category: "category", value: "value", aggregate: "sum", radiusScale: { range: [70, 140] } });
}
export function createRadialDisk() {
  return base().createRadialBarPlot({ id: "sectors", category: "category", value: "value", aggregate: "sum", radiusScale: { range: [0, 140] } });
}
export function createRadialHole() {
  return base().createRadialBarPlot({ id: "sectors", category: "category", value: "value", aggregate: "sum", radiusScale: { range: [70, 140] } });
}
export function createOrderedRadial() {
  return createRadialHole().orderCategories({ target: "sectors", channel: "theta", values: ["C", "A"] })
    .editLegend({ target: "sectors", order: { channel: "theta" } });
}
