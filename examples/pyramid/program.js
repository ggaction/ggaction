import { chart } from "../../src/index.js";
import { pyramidOptions } from "./fixture.js";
export function createPyramid(id = "width") {
  const options = pyramidOptions(id);
  return chart().createCanvas(options.canvas).createData(options.data).createPyramidPlot(options.plot);
}
