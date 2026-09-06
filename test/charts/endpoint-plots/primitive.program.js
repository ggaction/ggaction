import { chart } from "../../../src/index.js";
import { endpointRows } from "../../../examples/dot-plot/program.js";

function base(values) {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 50 })
    .createData({ id: "data", values });
}

export function createDotPrimitive(values = endpointRows) {
  return base(values)
    .createPointMark({ id: "dot", data: "data" })
    .encodeX({ target: "dot", field: "value", fieldType: "quantitative", scale: { id: "dotValue" } })
    .encodeY({ target: "dot", field: "category", fieldType: "nominal", scale: { id: "dotCategory" } });
}

export function createLollipopPrimitive(values = endpointRows) {
  return base(values)
    .createRuleMark({ id: "lollipopStem", data: "data" })
    .encodeX({ target: "lollipopStem", field: "value", fieldType: "quantitative", scale: { id: "lollipopValue" } })
    .encodeY({ target: "lollipopStem", field: "category", fieldType: "nominal", scale: { id: "lollipopCategory" } })
    .encodeX2({ target: "lollipopStem", datum: 0, fieldType: "quantitative" })
    .createPointMark({ id: "lollipop", data: "data" })
    .encodeX({ target: "lollipop", field: "value", fieldType: "quantitative", scale: { id: "lollipopValue" } })
    .encodeY({ target: "lollipop", field: "category", fieldType: "nominal", scale: { id: "lollipopCategory" } });
}

export function createDumbbellPrimitive(values = endpointRows) {
  return base(values)
    .createRuleMark({ id: "dumbbellConnector", data: "data" })
    .encodeX({ target: "dumbbellConnector", field: "before", fieldType: "quantitative", scale: { id: "dumbbellValue" } })
    .encodeY({ target: "dumbbellConnector", field: "category", fieldType: "nominal", scale: { id: "dumbbellCategory" } })
    .encodeX2({ target: "dumbbellConnector", field: "after", fieldType: "quantitative" })
    .createPointMark({ id: "dumbbellStart", data: "data" })
    .encodeX({ target: "dumbbellStart", field: "before", fieldType: "quantitative", scale: { id: "dumbbellValue" } })
    .encodeY({ target: "dumbbellStart", field: "category", fieldType: "nominal", scale: { id: "dumbbellCategory" } })
    .createPointMark({ id: "dumbbell", data: "data" })
    .encodeX({ target: "dumbbell", field: "after", fieldType: "quantitative", scale: { id: "dumbbellValue" } })
    .encodeY({ target: "dumbbell", field: "category", fieldType: "nominal", scale: { id: "dumbbellCategory" } });
}
