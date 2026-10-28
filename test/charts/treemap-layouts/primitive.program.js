import { chart } from "../../../src/index.js";
import { canvas, rows, labels, colors, offset, variants } from "./reference-values.js";

export function createTreemapPrimitive(variantId = "slice-dice") {
  const variant = variants.find(item => item.id === variantId);
  if (!variant) throw new Error(`Unknown treemap variant ${variantId}.`);
  const boxes = variant.rectangles;
  return chart()
    .createCanvas(canvas)
    .createData({ id: "hierarchy-source", values: rows })
    .createGraphics({ id: "cells", type: "rect", length: 5, parent: "plot-main" })
    .editGraphics({ target: "cells", property: "x", value: boxes.map(box => box[0] + offset[0]) })
    .editGraphics({ target: "cells", property: "y", value: boxes.map(box => box[1] + offset[1]) })
    .editGraphics({ target: "cells", property: "width", value: boxes.map(box => box[2] - box[0]) })
    .editGraphics({ target: "cells", property: "height", value: boxes.map(box => box[3] - box[1]) })
    .editGraphics({ target: "cells", property: "fill", value: colors })
    .editGraphics({ target: "cells", property: "opacity", value: 1 })
    .editGraphics({ target: "cells", property: "stroke", value: "#ffffff" })
    .editGraphics({ target: "cells", property: "strokeWidth", value: 2 })
    .createGraphics({ id: "labels", type: "text", length: 5, parent: "plot-main" })
    .editGraphics({ target: "labels", property: "x", value: variant.labelPositions.map(point => point[0] + offset[0]) })
    .editGraphics({ target: "labels", property: "y", value: variant.labelPositions.map(point => point[1] + offset[1]) })
    .editGraphics({ target: "labels", property: "text", value: labels })
    .editGraphics({ target: "labels", property: "fill", value: ["#475569", "#1e40af", "#0f172a", "#ffffff", "#0f172a"] })
    .editGraphics({ target: "labels", property: "fontSize", value: [11, 11, 16, 16, 16] })
    .editGraphics({ target: "labels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "labels", property: "fontWeight", value: 500 })
    .editGraphics({ target: "labels", property: "textAlign", value: "center" })
    .editGraphics({ target: "labels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "heading", type: "text", length: 2, parent: "canvas" })
    .editGraphics({ target: "heading", property: "x", value: 32 })
    .editGraphics({ target: "heading", property: "y", value: [28, 52] })
    .editGraphics({ target: "heading", property: "text", value: [variant.title, "Leaf values 2, 4 and 4; nested padding preserves the hierarchy"] })
    .editGraphics({ target: "heading", property: "fill", value: ["#0f172a", "#64748b"] })
    .editGraphics({ target: "heading", property: "fontSize", value: [20, 12] })
    .editGraphics({ target: "heading", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "heading", property: "fontWeight", value: [600, 400] })
    .editGraphics({ target: "heading", property: "textAlign", value: "left" })
    .editGraphics({ target: "heading", property: "textBaseline", value: "middle" });
}
