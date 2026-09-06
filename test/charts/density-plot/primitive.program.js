import { chart } from "../../../src/index.js";
import { layout, rows, statistics } from "./reference-values.js";

export function createVerticalPrimitive() {
  return chart()
    .createCanvas(layout)
    .createData({ id: "source", values: rows })
    .createAreaMark({ id: "density", data: "source" })
    .encodeDensity({ target: "density", field: "value", ...statistics })
    .createGuides();
}

export function createGroupedPrimitive() {
  return chart()
    .createCanvas(layout)
    .createData({ id: "source", values: rows })
    .createAreaMark({ id: "density", data: "source" })
    .encodeDensity({ target: "density", field: "value", groupBy: "group", ...statistics })
    .encodeColor({ target: "density", field: "group" })
    .createGuides({ legend: { target: "density" } });
}

export function createHorizontalPrimitive() {
  return chart()
    .createCanvas(layout)
    .createData({ id: "source", values: rows })
    .createAreaMark({ id: "density", data: "source" })
    .encodeDensity({ target: "density", field: "value", groupBy: "group", densityChannel: "x", ...statistics })
    .encodeColor({ target: "density", field: "group" })
    .createGuides({ legend: { target: "density" } });
}
