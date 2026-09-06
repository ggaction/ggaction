import { chart } from "../../src/index.js";
import { endpointRows } from "../dot-plot/program.js";

export function createDumbbellPlotExample(values = endpointRows) {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 50 })
    .createData({ id: "data", values })
    .createDumbbellPlot({
      id: "dumbbell", category: "category", start: "before", end: "after", guides: false
    });
}
