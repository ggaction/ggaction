import { chart } from "../../src/index.js";
import { canvas, values, plot } from "./fixture.js";
export function createStreamgraph() {
  return chart().createCanvas(canvas).createData({ id: "data", values }).createAreaPlot(plot);
}
