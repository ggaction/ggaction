import { createBarPlot } from "./bar.js";
import { createHeatmap } from "./heatmap.js";
import { createHistogram } from "./histogram.js";
import { createLinePlot } from "./line.js";
import { createScatterPlot } from "./scatter.js";

export function registerChartActions(ProgramClass) {
  ProgramClass.prototype.createBarPlot = createBarPlot;
  ProgramClass.prototype.createHeatmap = createHeatmap;
  ProgramClass.prototype.createHistogram = createHistogram;
  ProgramClass.prototype.createScatterPlot = createScatterPlot;
  ProgramClass.prototype.createLinePlot = createLinePlot;
}
