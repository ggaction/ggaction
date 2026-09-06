import { chart } from "../../../src/index.js";
import { layout, rows } from "../../../examples/theta-legend-order/program.js";

export function createLinkedPrimitive() {
  return chart().createCanvas(layout).createData({ id: "source", values: rows })
    .createArcMark({ id: "pie", data: "source" })
    .encodeTheta({ target: "pie", field: "category", fieldType: "nominal", aggregate: "sum", weight: "value" })
    .encodeColor({ target: "pie", field: "category" })
    .createGuides({ axes: false, grid: false, legend: { target: "pie" } })
    .editSemantic({ property: "layer[pie].encoding.theta.categoryOrder", value: { values: ["C", "A"] } })
    .rematerializeScale({ id: "theta" })
    .rematerializeArcMark({ id: "pie" })
    .editSemantic({ property: "guide.legend.color.order", value: { channel: "theta" } })
    .rematerializeLegend();
}
export function createIndependentPrimitive() {
  return createLinkedPrimitive()
    .editSemantic({ property: "guide.legend.color.order", value: { values: ["B"] } })
    .rematerializeLegend();
}
