import { chart } from "../../../src/index.js";
import { canvas, pyramidReference } from "./reference-values.js";
export function createPyramidPrimitive(id = "width") {
  const reference = pyramidReference(id);
  return chart().createCanvas(canvas)
    .createGraphics({ id: "pyramid", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "pyramid", property: "items", value: reference.graphics })
    .editGraphics({ target: "pyramid", property: "clip", value: reference.clip });
}
