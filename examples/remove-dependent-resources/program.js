import { chart, hconcat } from "../../src/index.js";

export function createResourceRemovalWorkflow() {
  const before = chart()
    .createCanvas({ width: 360, height: 280, margin: 60 })
    .createData({ id: "rows", values: [{ x: 1, y: 2 }, { x: 3, y: 4 }] })
    .createScatterPlot({ id: "main", data: "rows", x: "x", y: "y" })
    .createData({ id: "temporary", values: [{ x: 2, y: 3 }] })
    .createPointMark({ id: "preview", data: "temporary", fill: "#dc2626" })
    .encodeX({ target: "preview", field: "x", scale: { id: "previewX" } })
    .encodeY({ target: "preview", field: "y", scale: { id: "previewY" } });
  try {
    before.removeData({ id: "temporary" });
  } catch (error) {
    if (!/preview/.test(error.message)) throw error;
  }
  const after = before.removeMark({ target: "preview" }).removeData({ id: "temporary" });
  return hconcat({ programs: [
    before.createTitle({ text: "Temporary red preview" }),
    after.createTitle({ text: "Preview and data removed" })
  ], gap: 20 });
}
