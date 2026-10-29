import { chart } from "../../../src/index.js";
import { canvas, ohlcReference } from "./reference-values.js";
export function createOHLCPrimitive(id = "prices") {
  const reference = ohlcReference(id);
  return chart().createCanvas(canvas).createGraphics({ id: "ohlc", type: "collection", parent: "plot-main" })
    .editGraphics({ target: "ohlc", property: "items", value: reference.graphics })
    .editGraphics({ target: "ohlc", property: "clip", value: reference.clip });
}
