import { chart } from "../../../src/index.js";
import { layout, rows } from "./reference-values.js";

// These are explicit Current lower-action programs, not implementations of the planned facade.
export function createCountPrimitive() {
  return chart()
    .createCanvas(layout)
    .createData({ id: "source", values: rows })
    .createArcMark({ id: "pie", data: "source" })
    .encodeTheta({ target: "pie", field: "category", fieldType: "nominal", aggregate: "count" })
    .encodeColor({ target: "pie", field: "category" })
    .createGuides({ axes: false, grid: false, legend: { target: "pie" } });
}

export function createWeightedPrimitive() {
  return chart()
    .createCanvas(layout)
    .createData({ id: "source", values: rows })
    .createArcMark({ id: "pie", data: "source" })
    .encodeTheta({ target: "pie", field: "category", fieldType: "nominal", aggregate: "sum", weight: "value" })
    .encodeColor({ target: "pie", field: "category" })
    .createGuides({ axes: false, grid: false, legend: { target: "pie" } });
}

export function createDonutPrimitive() {
  return chart()
    .createCanvas(layout)
    .createData({ id: "source", values: rows })
    .createArcMark({ id: "pie", data: "source", innerRadius: 0.55, padAngle: 2 })
    .encodeTheta({ target: "pie", field: "category", fieldType: "nominal", aggregate: "sum", weight: "value" })
    .encodeColor({ target: "pie", field: "category" })
    .createGuides({ axes: false, grid: false, legend: { target: "pie" } });
}
