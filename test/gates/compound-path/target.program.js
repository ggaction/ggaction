import { chart } from "../../../src/index.js";
import { frame, paint, pixelCommands, underlay, shapeBounds } from "./manifest.js";

// Exact proposed extension-primitive flow. Activation and renderer integration
// require approval of the stored values and the rendered target.
export function targetProgram(variant) {
  const base = chart().createCanvas({ width: frame.width, height: frame.height, margin: 0 })
    .createGraphics({ id: "underlay", type: "rect", parent: "plot-main" })
    .editGraphics({ target: "underlay", property: "x", value: underlay.x })
    .editGraphics({ target: "underlay", property: "y", value: underlay.y })
    .editGraphics({ target: "underlay", property: "width", value: underlay.width })
    .editGraphics({ target: "underlay", property: "height", value: underlay.height })
    .editGraphics({ target: "underlay", property: "fill", value: paint.underlay });
  if (variant.kind === "clip") return base
    .createGraphics({ id: "shape", type: "rect", parent: "plot-main" })
    .editGraphics({ target: "shape", property: "x", value: shapeBounds.x })
    .editGraphics({ target: "shape", property: "y", value: shapeBounds.y })
    .editGraphics({ target: "shape", property: "width", value: shapeBounds.width })
    .editGraphics({ target: "shape", property: "height", value: shapeBounds.height })
    .editGraphics({ target: "shape", property: "fill", value: paint.fill })
    .editGraphics({ target: "shape", property: "opacity", value: paint.opacity })
    .editGraphics({ target: "shape", property: "clip", value: { type: "path", commands: pixelCommands(variant), fillRule: variant.fillRule } });
  const filled = base.createGraphics({ id: "shape", type: "path", parent: "plot-main" })
    .editGraphics({ target: "shape", property: "commands", value: pixelCommands(variant) })
    .editGraphics({ target: "shape", property: "fillRule", value: variant.fillRule })
    .editGraphics({ target: "shape", property: "fill", value: paint.fill })
    .editGraphics({ target: "shape", property: "opacity", value: paint.opacity });
  return variant.kind === "points" ? filled : filled
    .editGraphics({ target: "shape", property: "stroke", value: paint.stroke })
    .editGraphics({ target: "shape", property: "strokeWidth", value: 2 });
}
