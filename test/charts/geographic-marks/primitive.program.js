import { chart } from "../../../src/index.js";
import { canvas, region, route, points, graticule } from "./reference-values.js";
export function createGeographicPrimitive(variant = "planar") {
  if (variant === "graticule") return chart().createCanvas(canvas)
    .createGraphics({ id: "grid", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "grid", property: "items", value: graticule });
  if (variant !== "planar") throw new Error("Unknown geographic primitive variant.");
  return chart().createCanvas(canvas)
    .createGraphics({ id: "regions", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "regions", property: "items", value: [region] })
    .createGraphics({ id: "routes", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "routes", property: "items", value: [route] })
    .createGraphics({ id: "cities", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "cities", property: "items", value: points });
}
