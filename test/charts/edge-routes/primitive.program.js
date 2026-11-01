import { chart } from "../../../src/index.js";
import { routeCanvas, methodRoutePaths, routePositions } from "./reference-values.js";

export function createEdgeRoutePrimitive(method = "edge-path", clipped = false) {
  const program = chart().createCanvas(clipped ? { ...routeCanvas, margin: { left: 80, right: 80, top: 70, bottom: 70 } } : routeCanvas)
    .createGraphics({ id: "network", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "network", property: "items", value: [
      ...methodRoutePaths(method).map(commands => ({ type: "path", properties: { commands: clipped ? commands.map(command => ({ ...command, x: command.x + 80, y: command.y + 70 })) : commands, fill: "none", stroke: "#2563eb", strokeWidth: 2, opacity: 1 } })),
      ...routePositions.map(({ x, y }) => ({ type: "circle", properties: { x: x + (clipped ? 80 : 0), y: y + (clipped ? 70 : 0), radius: 6, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1, opacity: 1 } })),
      ...routePositions.map(({ key, x, y }) => ({ type: "text", properties: { x: x + (clipped ? 80 : 0), y: y + 20 + (clipped ? 70 : 0), text: key, fill: "#0f172a", fontSize: 14, fontFamily: "sans-serif", fontWeight: "normal", textAlign: "center", textBaseline: "middle" } }))
    ] });
  return clipped ? program.editGraphics({ target: "network", property: "clip", value: { x: 80, y: 70, width: 160, height: 100 } }) : program;
}
