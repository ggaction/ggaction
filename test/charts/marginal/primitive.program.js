import { chart, hconcat, vconcat } from "../../../src/index.js";
import { panels } from "../../../examples/marginal/fixture.js";
import { xRects, yRects, points } from "./reference-values.js";
export function createMarginalPrimitive() {
  const x = chart().createCanvas(panels.x)
    .createGraphics({ id: "histogram", type: "rect", parent: "plot-main", length: 5 })
    .editGraphics({ target: "histogram", property: "items", value: xRects });
  const center = chart().createCanvas(panels.center)
    .createGraphics({ id: "points", type: "circle", parent: "plot-main", length: 6 })
    .editGraphics({ target: "points", property: "items", value: points });
  const y = chart().createCanvas(panels.y)
    .createGraphics({ id: "histogram", type: "rect", parent: "plot-main", length: 5 })
    .editGraphics({ target: "histogram", property: "items", value: yRects });
  const lower = hconcat({ id: "lower", programs: [{ id: "center", program: center }, { id: "y", program: y }], gap: 12 });
  return vconcat({ id: "marginal", programs: [{ id: "x", program: x }, { id: "lower", program: lower }], gap: 0, align: "start" });
}
