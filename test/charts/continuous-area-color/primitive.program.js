import { chart } from "../../../src/index.js";
import { areaItems } from "./reference-values.js";

export function createContinuousAreaPrimitive() {
  return chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: 320 })
    .editGraphics({ target: "canvas", property: "height", value: 220 })
    .editGraphics({ target: "canvas", property: "background", value: "white" })
    .createGraphics({ id: "plot-main", type: "collection", parent: "canvas" })
    .createGraphics({ id: "areaPlot", type: "path", parent: "plot-main", length: 9 })
    .editGraphics({ target: "areaPlot", property: "commands", value: areaItems().map(item => item.properties.commands) })
    .editGraphics({ target: "areaPlot", property: "fill", value: areaItems().map(item => item.properties.fill) })
    .editGraphics({ target: "areaPlot", property: "opacity", value: 0.7 });
}
