import { chart } from "../../../src/index.js";
import { canvas, expected } from "./reference-values.js";
export function createWaterfallPrimitive({ labels = false, connectors = true } = {}) {
  const items = expected.rectangles.flatMap((rectangle, index) => {
    const result = [];
    if (connectors && expected.connectors[index]) {
      const [x1, x2, y] = expected.connectors[index];
      result.push({ type: "path", properties: { commands: [{ op: "M", x: x1, y }, { op: "L", x: x2, y }], stroke: "#64748b", strokeWidth: 1, opacity: 1 } });
    }
    result.push({ type: "rect", properties: { ...rectangle, stroke: "#334155", strokeWidth: 1, opacity: 1 } });
    if (labels) {
      const [x, y, text] = expected.labels[index];
      result.push({ type: "text", properties: { x, y, text, textAlign: "center", textBaseline: "bottom", fill: "#0f172a", fontFamily: "sans-serif", fontSize: 12, fontWeight: "normal" } });
    }
    return result;
  });
  return chart().createCanvas(canvas).createGraphics({ id: "waterfall", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "waterfall", property: "items", value: items })
    .editGraphics({ target: "waterfall", property: "clip", value: { x: 40, y: 40, width: 420, height: 240 } });
}
