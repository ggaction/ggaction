import { chart } from "../../src/index.js";
import { ohlcOptions } from "./fixture.js";
export function createOHLC(id = "prices") {
  const options = ohlcOptions(id);
  return chart().createCanvas(options.canvas).createData(options.data).createOHLCPlot(options.plot);
}
