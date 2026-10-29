import { chart } from "../../../src/index.js";
import { routeCanvas, routePaths, routePositions } from "./reference-values.js";

export function createEdgeRoutePrimitive() {
  return chart().createCanvas(routeCanvas)
    .createGraphics({ id: "network", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "network", property: "items", value: [
      ...routePaths.map(commands => ({ type: "path", properties: { commands, fill: "none", stroke: "#2563eb", strokeWidth: 2, opacity: 1 } })),
      ...routePositions.map(({ x, y }) => ({ type: "circle", properties: { x, y, radius: 6, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1, opacity: 1 } })),
      ...routePositions.map(({ key, x, y }) => ({ type: "text", properties: { x, y: y + 20, text: key, fill: "#0f172a", fontSize: 14, fontFamily: "sans-serif", fontWeight: "normal", textAlign: "center", textBaseline: "middle" } }))
    ] });
}
