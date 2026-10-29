import { chart } from "../../src/index.js";
import { contourOptions } from "./options.js";
export function createContours(id = "line") {
  const options = contourOptions(id);
  let program = chart().createCanvas(options.canvas);
  program = options.density ? program.createData(options.data).createDensityContourData(options.geometry)
    : program.createContourData(options.geometry);
  return program.createContourMark(options.mark).createTitle(options.title);
}
