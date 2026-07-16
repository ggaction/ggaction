import { createBoxMedian, createBoxOutliers } from "./components.js";
import { createBoxPlot } from "./create.js";
import { materializeBoxPlot } from "./materialize.js";

export function registerBoxPlotActions(ProgramClass) {
  ProgramClass.prototype.createBoxPlot = createBoxPlot;
  ProgramClass.prototype.materializeBoxPlot = materializeBoxPlot;
  ProgramClass.prototype.createBoxMedian = createBoxMedian;
  ProgramClass.prototype.createBoxOutliers = createBoxOutliers;
}
