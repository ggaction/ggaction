import { chart } from "../../../src/index.js";
import { layout, rows } from "../../../examples/radial-sectors/program.js";
export function createRadialPrimitive({ mapping = "area", inner = 0, ordered = false } = {}) {
  let program = chart().createCanvas(layout).createData({ id: "source", values: rows })
    .createArcMark({ id: "sectors", data: "source" })
    .encodeTheta({ target: "sectors", field: "category", fieldType: "nominal" })
    .createScale({ id: "radius", type: "linear", domain: "auto", range: [inner, 140], zero: true, nice: false })
    .editSemantic({ property: "scale[radius].radialMapping", value: mapping })
    .editSemantic({ property: "layer[sectors].encoding.radius.field", value: "value" })
    .editSemantic({ property: "layer[sectors].encoding.radius.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[sectors].encoding.radius.aggregate", value: "sum" })
    .editSemantic({ property: "layer[sectors].encoding.radius.scale", value: "radius" })
    .rematerializeArcMark({ id: "sectors" })
    .encodeColor({ target: "sectors", field: "category" })
    .createGuides();
  if (ordered) program = program
    .editSemantic({ property: "layer[sectors].encoding.theta.categoryOrder", value: { values: ["C", "A"] } })
    .rematerializeScale({ id: "theta" }).rematerializeArcMark({ id: "sectors" })
    .editSemantic({ property: "guide.legend.color.order", value: { channel: "theta" } }).rematerializeLegend();
  return program;
}
