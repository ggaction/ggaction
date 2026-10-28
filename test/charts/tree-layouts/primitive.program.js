import { chart } from "../../../src/index.js";
import { canvas, rows, labels, colors, parents, children, variants } from "./reference-values.js";

export function createTreePrimitive(variantId = "vertical") {
  const variant = variants.find(item => item.id === variantId);
  if (!variant) throw new Error(`Unknown tree variant ${variantId}.`);
  const points = variant.positions;
  return chart()
    .createCanvas(canvas)
    .createData({ id: "hierarchy-source", values: rows })
    .createGraphics({ id: "links", type: "line", length: 4, parent: "plot-main" })
    .editGraphics({ target: "links", property: "x1", value: parents.map(index => points[index][0]) })
    .editGraphics({ target: "links", property: "y1", value: parents.map(index => points[index][1]) })
    .editGraphics({ target: "links", property: "x2", value: children.map(index => points[index][0]) })
    .editGraphics({ target: "links", property: "y2", value: children.map(index => points[index][1]) })
    .editGraphics({ target: "links", property: "stroke", value: "#94a3b8" })
    .editGraphics({ target: "links", property: "strokeWidth", value: 2 })
    .editGraphics({ target: "links", property: "opacity", value: 1 })
    .createGraphics({ id: "nodes", type: "circle", length: 5, parent: "plot-main" })
    .editGraphics({ target: "nodes", property: "x", value: points.map(point => point[0]) })
    .editGraphics({ target: "nodes", property: "y", value: points.map(point => point[1]) })
    .editGraphics({ target: "nodes", property: "radius", value: 18 })
    .editGraphics({ target: "nodes", property: "fill", value: colors })
    .editGraphics({ target: "nodes", property: "opacity", value: 1 })
    .editGraphics({ target: "nodes", property: "stroke", value: "#ffffff" })
    .editGraphics({ target: "nodes", property: "strokeWidth", value: 2 })
    .createGraphics({ id: "labels", type: "text", length: 5, parent: "plot-main" })
    .editGraphics({ target: "labels", property: "x", value: points.map(point => point[0]) })
    .editGraphics({ target: "labels", property: "y", value: points.map(point => point[1] + 32) })
    .editGraphics({ target: "labels", property: "text", value: labels })
    .editGraphics({ target: "labels", property: "fill", value: "#0f172a" })
    .editGraphics({ target: "labels", property: "fontSize", value: 14 })
    .editGraphics({ target: "labels", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "labels", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "labels", property: "textAlign", value: "center" })
    .editGraphics({ target: "labels", property: "textBaseline", value: "middle" })
    .createGraphics({ id: "heading", type: "text", length: 2, parent: "canvas" })
    .editGraphics({ target: "heading", property: "x", value: 32 })
    .editGraphics({ target: "heading", property: "y", value: [28, 52] })
    .editGraphics({ target: "heading", property: "text", value: [variant.title, "One hierarchy, five stable nodes and four parent links"] })
    .editGraphics({ target: "heading", property: "fill", value: ["#0f172a", "#64748b"] })
    .editGraphics({ target: "heading", property: "fontSize", value: [20, 12] })
    .editGraphics({ target: "heading", property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target: "heading", property: "fontWeight", value: [600, 400] })
    .editGraphics({ target: "heading", property: "textAlign", value: "left" })
    .editGraphics({ target: "heading", property: "textBaseline", value: "middle" });
}
