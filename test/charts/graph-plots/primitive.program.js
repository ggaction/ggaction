import { chart } from "../../../src/index.js";
import { canvas, graphVariant } from "./reference-values.js";

export function createGraphPrimitive(id = "directed") {
  const variant = graphVariant(id);
  return chart()
    .createCanvas(canvas)
    .createGraphics({ id: "network", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "network", property: "items", value: [
      ...variant.paths.map((commands, index) => ({ type: "path", properties: {
        commands, fill: variant.pathFills[index], stroke: variant.pathStrokes[index], strokeWidth: variant.pathWidths[index], opacity: 1
      } })),
      ...variant.positions.map(node => ({ type: "circle", properties: {
        x: node.x, y: node.y, radius: 10, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1, opacity: 1
      } })),
      ...variant.positions.map(node => ({ type: "text", properties: {
        x: node.x, y: node.y + 24, text: node.key, fill: "#0f172a", fontSize: 14, fontFamily: "sans-serif",
        fontWeight: "normal", textAlign: "center", textBaseline: "middle"
      } }))
    ] });
}
