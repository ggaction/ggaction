import { chart, hconcat } from "../../src/index.js";

export function createCustomThemeWorkflow() {
  const base = chart()
    .createCanvas({ width: 360, height: 280, margin: 60 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 3, y: 4 }] })
    .createScatterPlot({ id: "points", x: "x", y: "y" });
  const themed = base.applyTheme({ theme: { base: "light", tokens: {
    background: "#f5f3ff", mark: "#7c3aed", axis: "#5b21b6"
  } } });
  const overridden = themed.editPointMark({ target: "points", fill: "#ea580c" });
  const restored = overridden.removeTheme();
  return hconcat({ programs: [
    themed.createTitle({ text: "Custom theme" }),
    overridden.createTitle({ text: "Orange override" }),
    restored.createTitle({ text: "Theme removed" })
  ], gap: 16 });
}
