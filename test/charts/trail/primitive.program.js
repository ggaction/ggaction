import { chart } from "../../../src/index.js";
import { canvas, expected, ribbonCommands } from "./reference-values.js";
export function createTrailPrimitive({ constant = false } = {}) {
  const items = expected.y.map((_, index) => ({ type: "path", properties: {
    commands: ribbonCommands(index, constant), fill: expected.colors[index], stroke: "none", strokeWidth: 0, opacity: 1, fillRule: "nonzero"
  } }));
  return chart().createCanvas(canvas).createGraphics({ id: "trail", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "trail", property: "items", value: items })
    .editGraphics({ target: "trail", property: "clip", value: { x: 40, y: 40, width: 340, height: 160 } });
}
