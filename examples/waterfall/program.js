import { chart } from "../../src/index.js";
import { waterfallOptions } from "./fixture.js";
export function createWaterfall(id = "contributions") {
  const options = waterfallOptions(id);
  return chart().createCanvas(options.canvas).createData(options.data).createWaterfallPlot(options.plot);
}
