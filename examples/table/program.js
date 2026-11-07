import { chart } from "../../src/index.js";
import { tableOptions } from "./fixture.js";
export function createTable() {
  const options = tableOptions();
  return chart().createCanvas(options.canvas).createData(options.data).createTablePlot(options.plot);
}
