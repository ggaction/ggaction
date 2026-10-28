import { chart } from "../../src/index.js";
import { frame, rows, variants } from "./data.js";

export function createStructuredPaintExample(variant = variants.find(value => value.id === "cross")) {
  return chart()
    .createCanvas(frame)
    .createData({ values: rows })
    .createRectMark({ id: "paint", fill: variant.fill, opacity: variant.opacity, stroke: false })
    .encodeXRange({ lower: "left", upper: "right", scale: { domain: [0, 1] } })
    .encodeYRange({ lower: "lower", upper: "upper", scale: { domain: [0, 1] } });
}
