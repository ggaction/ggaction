import { chart } from "../../../src/index.js";
import { areaCommands, lineCommands } from "./reference-values.js";
export function createBootstrapMeanPrimitive() {
  return chart().createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: 320 })
    .editGraphics({ target: "canvas", property: "height", value: 220 })
    .editGraphics({ target: "canvas", property: "background", value: "white" })
    .createGraphics({ id: "plot-main", type: "collection", parent: "canvas" })
    .createGraphics({ id: "areaPlot", type: "path", parent: "plot-main", length: 1 })
    .editGraphics({ target: "areaPlot", property: "commands", value: [areaCommands] })
    .editGraphics({ target: "areaPlot", property: "fill", value: "#4c78a8" })
    .editGraphics({ target: "areaPlot", property: "opacity", value: 0.3 })
    .createGraphics({ id: "meanLine", type: "path", parent: "plot-main", length: 1 })
    .editGraphics({ target: "meanLine", property: "commands", value: [lineCommands] })
    .editGraphics({ target: "meanLine", property: "stroke", value: "#4c78a8" })
    .editGraphics({ target: "meanLine", property: "strokeWidth", value: 2 })
    .editGraphics({ target: "meanLine", property: "strokeDash", value: [[]] });
}
