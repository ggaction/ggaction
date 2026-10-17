import { chart } from "../../src/index.js";

export const layout = Object.freeze({ width: 480, height: 270, margin: 0 });
export const rows = Object.freeze([
  { x: 85, y: 170, shape: "wedge", area: 100, angle: 0, labelX: 60, labelY: 133, label: "area 100, 0°" },
  { x: 195, y: 170, shape: "wedge", area: 225, angle: 90, labelX: 170, labelY: 133, label: "area 225, 90°" },
  { x: 85, y: 90, shape: "arrow", area: 100, angle: 0, labelX: 60, labelY: 53, label: "area 100, 0°" },
  { x: 195, y: 90, shape: "arrow", area: 225, angle: 90, labelX: 170, labelY: 53, label: "area 225, 90°" }
].map(Object.freeze));
export const scatter = { x: { field: "x", scale: { domain: [0, 480], nice: false } },
  y: { field: "y", scale: { domain: [0, 270], nice: false } }, guides: false };
export const shape = { field: "shape", scale: { domain: ["wedge", "arrow"], range: ["wedge", "arrow"] } };
export const size = { field: "area", scale: { domain: [100, 225], range: [100, 225] } };
export const angle = { field: "angle" };
export const labelX = { field: "labelX", scale: { id: "x", domain: [0, 480], nice: false } };
export const labelY = { field: "labelY", scale: { id: "y", domain: [0, 270], nice: false } };
export const publicCalls = [
  { op: "createCanvas", args: layout }, { op: "createData", args: { id: "shapes", values: rows } },
  { op: "createScatterPlot", args: scatter }, { op: "editPointMark", args: { fill: "#4c78a8", opacity: 1 } },
  { op: "encodeShape", args: shape }, { op: "encodeSize", args: size }, { op: "encodeAngle", args: angle },
  { op: "createTextMark", args: { id: "labels", data: "shapes" } },
  { op: "editTextMark", args: { fontFamily: "Arial", fontSize: 12, fill: "#222" } },
  { op: "editTextMark", args: { align: "left", baseline: "alphabetic" } },
  { op: "encodeX", args: labelX }, { op: "encodeY", args: labelY }, { op: "encodeText", args: { field: "label" } }
];
export function createNamedShapes() {
  return chart().createCanvas(layout).createData({ id: "shapes", values: rows })
    .createScatterPlot(scatter).editPointMark({ fill: "#4c78a8", opacity: 1 })
    .encodeShape(shape).encodeSize(size).encodeAngle(angle)
    .createTextMark({ id: "labels", data: "shapes" })
    .editTextMark({ fontFamily: "Arial", fontSize: 12, fill: "#222" })
    .editTextMark({ align: "left", baseline: "alphabetic" })
    .encodeX(labelX).encodeY(labelY).encodeText({ field: "label" });
}
