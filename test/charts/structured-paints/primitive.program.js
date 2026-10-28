import { chart } from "../../../src/index.js";
import { frame } from "../../../examples/structured-paints/data.js";

export function createStructuredPaintPrimitive(variant) {
  const { coordinateSpace, ...options } = variant.fill;
  const fill = variant.fill.type === "pattern" ? { ...options, origin: { x: 23, y: 25 } } : options;
  return chart().createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: frame.width })
    .editGraphics({ target: "canvas", property: "height", value: frame.height })
    .editGraphics({ target: "canvas", property: "background", value: "white" })
    .createGraphics({ id: "plot-main", type: "collection", parent: "canvas" })
    .createGraphics({ id: "paint", type: "rect", length: 1, parent: "plot-main" })
    .editGraphics({ target: "paint", property: "x", value: 20 })
    .editGraphics({ target: "paint", property: "y", value: 20 })
    .editGraphics({ target: "paint", property: "width", value: 220 })
    .editGraphics({ target: "paint", property: "height", value: 140 })
    .editGraphics({ target: "paint", property: "fill", value: fill })
    .editGraphics({ target: "paint", property: "opacity", value: variant.opacity })
    .editGraphics({ target: "paint", property: "stroke", value: "transparent" })
    .editGraphics({ target: "paint", property: "strokeWidth", value: 0 });
}
