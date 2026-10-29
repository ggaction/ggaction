import { chart } from "../../../src/index.js";
import { canvas, region, route, points, graticule, annotationText, measuredRegion, measuredRoute, measuredPoints } from "./reference-values.js";
export function createGeographicPrimitive(variant = "planar") {
  if (variant === "fields") return chart().createCanvas(canvas)
    .createGraphics({ id: "regions", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "regions", property: "items", value: [measuredRegion] })
    .createGraphics({ id: "routes", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "routes", property: "items", value: [measuredRoute] })
    .createGraphics({ id: "cities", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "cities", property: "items", value: measuredPoints });
  if (variant === "annotations") return createGeographicPrimitive("planar")
    .createGraphics({ id: "west-label", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "west-label", property: "items", value: [annotationText[0]] })
    .createGraphics({ id: "central-label", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "central-label", property: "items", value: [annotationText[1]] })
    .createGraphics({ id: "east-label", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "east-label", property: "items", value: [annotationText[2]] });
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
