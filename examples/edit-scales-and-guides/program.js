import { chart, hconcat } from "../../src/index.js";

export function createScaleGuidesWorkflow() {
  const before = chart()
    .createCanvas({ width: 440, height: 320, margin: 75 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 10, y: 6 }, { x: 100, y: 4 }] })
    .createScatterPlot({ id: "points", x: { field: "x", scale: { domain: [1, 100], nice: false } }, y: "y" });
  const after = before
    .editXScale({ target: "points", type: "log", domain: [1, 100], nice: false })
    .editXAxis({ ticksAndLabels: { values: [1, 10, 100], labels: { format: ".0f" } } });
  return hconcat({ programs: [
    before.createTitle({ text: "Linear position" }),
    after.createTitle({ text: "Log position, refreshed axis" })
  ], gap: 20 });
}
