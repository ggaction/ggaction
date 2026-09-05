import { chart } from "../../src/index.js";
import { layout, rows, targets } from "./data.js";

export function createPieExample(variant = "count") {
  return chart()
    .createCanvas(layout)
    .createData({ id: "source", values: rows })
    .createPiePlot(targets[variant]);
}
