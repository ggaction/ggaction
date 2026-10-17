import { chart } from "../../../src/index.js";
import { layout } from "../../../examples/color-controls/program.js";
import { primitiveItems } from "./fixtures.js";
export function createWhitePointPrimitive() {
  return chart().createCanvas(layout)
    .createGraphics({ id: "d65", type: "rect", parent: "plot-main", length: 9 })
    .editGraphics({ target: "d65", property: "items", value: primitiveItems("d65") })
    .createGraphics({ id: "d50", type: "rect", parent: "plot-main", length: 9 })
    .editGraphics({ target: "d50", property: "items", value: primitiveItems("d50") });
}
export function createColorControlsPrimitive() {
  return chart().createCanvas(layout)
    .createGraphics({ id: "gamma1", type: "rect", parent: "plot-main", length: 9 })
    .editGraphics({ target: "gamma1", property: "items", value: primitiveItems("gamma1") })
    .createGraphics({ id: "gamma22", type: "rect", parent: "plot-main", length: 9 })
    .editGraphics({ target: "gamma22", property: "items", value: primitiveItems("gamma22") })
    .createGraphics({ id: "power", type: "rect", parent: "plot-main", length: 9 })
    .editGraphics({ target: "power", property: "items", value: primitiveItems("power") });
}
