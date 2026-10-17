import { chart } from "../../../src/index.js";
import { namedShapeItems } from "../../oracles/directional-point-scenes.js";

// Explicit primitive chain from independent area/rotation formulas and authored labels.
export function createNamedShapesPrimitive() {
  return chart().createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: 480 })
    .editGraphics({ target: "canvas", property: "height", value: 270 })
    .editGraphics({ target: "canvas", property: "background", value: "white" })
    .createGraphics({ id: "plot-main", type: "collection", parent: "canvas" })
    .createGraphics({ id: "scatterPlot", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "scatterPlot", property: "items", value: namedShapeItems() })
    .createGraphics({ id: "labels", type: "text", parent: "plot-main", length: 4 })
    .editGraphics({ target: "labels", property: "x", value: [60, 170, 60, 170] })
    .editGraphics({ target: "labels", property: "y", value: [137, 137, 217, 217] })
    .editGraphics({ target: "labels", property: "text", value: ["area 100, 0°", "area 225, 90°", "area 100, 0°", "area 225, 90°"] })
    .editGraphics({ target: "labels", property: "fill", value: "#222" })
    .editGraphics({ target: "labels", property: "opacity", value: 1 })
    .editGraphics({ target: "labels", property: "fontSize", value: 12 })
    .editGraphics({ target: "labels", property: "fontFamily", value: "Arial" })
    .editGraphics({ target: "labels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "labels", property: "textAlign", value: "left" })
    .editGraphics({ target: "labels", property: "textBaseline", value: "alphabetic" })
    .editGraphics({ target: "labels", property: "rotation", value: 0 });
}
