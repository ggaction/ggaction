import { chart } from "../../../src/index.js";
import { canvas, contourReference } from "./reference-values.js";
export function createContourPrimitive(id = "line") {
  const reference = contourReference(id);
  return chart().createCanvas(canvas)
    .createGraphics({ id: "contours", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "contours", property: "items", value: reference.paths })
    .editGraphics({ target: "contours", property: "clip", value: reference.clip })
    .createGraphics({ id: "heading", type: "text", length: 2, parent: "canvas" })
    .editGraphics({ target: "heading", property: "x", value: 40 })
    .editGraphics({ target: "heading", property: "y", value: [28, 52] })
    .editGraphics({ target: "heading", property: "text", value: [reference.title, reference.subtitle] })
    .editGraphics({ target: "heading", property: "fill", value: ["#0f172a", "#64748b"] })
    .editGraphics({ target: "heading", property: "fontSize", value: [20, 12] })
    .editGraphics({ target: "heading", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "heading", property: "fontWeight", value: [600, 400] })
    .editGraphics({ target: "heading", property: "textAlign", value: "left" })
    .editGraphics({ target: "heading", property: "textBaseline", value: "middle" });
}
