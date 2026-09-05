import { chart } from "../../src/index.js";
import { layout, rows, targets } from "./data.js";

export function createDensityExample(variant = "vertical") {
  return chart().createCanvas(layout).createData({ id: "source", values: rows })
    .createDensityPlot(targets[variant]);
}
