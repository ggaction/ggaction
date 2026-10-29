import { chart } from "../../src/index.js";
export const layout = Object.freeze({ width: 470, height: 270,
  margin: { left: 65, top: 55, right: 95, bottom: 75 } });
export const rows = Object.freeze([{ x: 1, y: 10 }, { x: 5, y: 50 }, { x: 9, y: 90 }]);
export const scatter = Object.freeze({ x: { field: "x", scale: { domain: [0, 10], nice: false } },
  y: { field: "y", scale: { domain: [0, 100], nice: false } }, guides: false });
export const axes = Object.freeze({
  x: { ticksAndLabels: false, title: { text: "Inside title", offset: -20, alongOffset: 145, align: "right" } },
  y: [
    { id: "quantity", scale: "y", position: "left", offset: 0,
      ticksAndLabels: { values: [0, 50, 100], ticks: { strokeDash: [2, 2], strokeDashMap: [{ value: 50, strokeDash: [] }] } },
      title: { text: "Quantity", rotation: 0, offset: -10, alongOffset: -85, align: "left", baseline: "alphabetic" } }
  ]
});
export const grid = Object.freeze({ horizontal: { scale: "y", coordinate: "main", values: [0, 50, 100],
  strokeDash: [2, 2], strokeDashMap: [{ value: 50, strokeDash: [] }] } });
export const publicCalls = Object.freeze([
  { op: "createCanvas", args: layout }, { op: "createData", args: { id: "source", values: rows } },
  { op: "createScatterPlot", args: scatter },
  { op: "createAxes", args: axes }, { op: "editYAxis", args: { target: "quantity", offset: 20 } },
  { op: "editYAxisLabels", args: { target: "quantity", align: "right" } }, { op: "createGrid", args: grid }
]);
export function createAxisOwners() {
  return chart().createCanvas(layout).createData({ id: "source", values: rows })
    .createScatterPlot(scatter)
    .createAxes(axes).editYAxis({ target: "quantity", offset: 20 })
    .editYAxisLabels({ target: "quantity", align: "right" }).createGrid(grid);
}
