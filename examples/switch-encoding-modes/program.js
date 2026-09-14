import { chart, hconcat } from "../../src/index.js";

export function createEncodingModesWorkflow() {
  const before = chart()
    .createCanvas({ width: 360, height: 280, margin: 60 })
    .createData({ values: [
      { x: 1, y: 4, category: "A", mass: 2 },
      { x: 3, y: 2, category: "B", mass: 8 }
    ] })
    .createScatterPlot({ id: "points", x: "x", y: "y", guides: false, point: { radius: 9, stroke: "#64748b", strokeWidth: 3 } })
    .encodeChannels({ target: "points", channels: {
      stroke: { field: "category" }, opacity: { field: "mass" }
    } });
  const constant = before.encodeChannels({ target: "points", channels: {
    stroke: { value: "#7c3aed" }, opacity: { value: 0.5 }
  } });
  const restored = constant.encodeChannels({ target: "points", channels: {
    stroke: { field: "category" }, opacity: { field: "mass" }
  } });
  return hconcat({ programs: [
    before.createTitle({ text: "Field encodings" }),
    constant.createTitle({ text: "Constant appearance" }),
    restored.createTitle({ text: "Field encodings restored" })
  ], gap: 16 });
}
