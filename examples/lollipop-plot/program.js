import { chart } from "../../src/index.js";
import { endpointRows } from "../dot-plot/program.js";

export function createLollipopPlotExample(values = endpointRows) {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 50 })
    .createData({ id: "data", values })
    .createLollipopPlot({
      id: "lollipop", category: "category", value: "value", baseline: 0, guides: false
    });
}
