import { chart } from "../../src/index.js";
import { layout, rows, targets } from "./data.js";

export function createHorizonExample(variant = "signed") {
  const program = chart().createCanvas(layout).createData({ id: "source", values: rows[variant] })
    .createHorizonPlot(targets[variant]);
  return variant === "baseline-style" ? program.editHorizon({ target: "horizon", bands: 3 })
    .editAreaMark({ target: "horizon", opacity: 0.6 }) : program;
}
