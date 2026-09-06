import { chart } from "../../../src/index.js";
import { layout, rows } from "../../../examples/color-midpoint/program.js";
export function createMidpointPrimitive() {
  return chart().createCanvas(layout).createData({ id: "data", values: rows })
    .createPointMark({ id: "m", data: "data", stroke: "#334155", strokeWidth: 1 })
    .encodeX({ target: "m", field: "x" })
    .encodeY({ target: "m", field: "value" })
    .encodePointRadius({ target: "m", value: 7 })
    .encodeColor({ target: "m", field: "value", fieldType: "quantitative", scale: {
      id: "colors", type: "sequential", domain: [-2, 8], range: ["blue", "white", "red"]
    } })
    .editSemantic({ property: "scale[colors].midpoint", value: 0 })
    .rematerializeScale({ id: "colors" })
    .createGuides({ legend: { count: 3 } });
}
export function createClearedPrimitive() {
  return createMidpointPrimitive()
    .editSemantic({ property: "scale[colors].midpoint", remove: true })
    .rematerializeScale({ id: "colors" });
}
