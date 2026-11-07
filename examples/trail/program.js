import { chart } from "../../src/index.js";
import { trailOptions } from "./fixture.js";
export function createTrail(id = "sample-width") {
  const options = trailOptions(id);
  return chart().createCanvas(options.canvas).createData(options.data).createTrailPlot(options.plot);
}
