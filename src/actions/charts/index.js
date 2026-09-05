import { createHeatmap } from "./heatmap.js";
import { createBarPlot } from "./bar.js";
import { createHistogram } from "./histogram.js";
import { createLinePlot } from "./line.js";
import { createScatterPlot } from "./scatter.js";
import { createParallelCoordinates } from "./parallel.js";
import { createPiePlot } from "./pie.js";

export function registerChartActions(ProgramClass) {
  ProgramClass.prototype.createBarPlot = createBarPlot;
  ProgramClass.prototype.createHeatmap = createHeatmap;
  ProgramClass.prototype.createHistogram = createHistogram;
  ProgramClass.prototype.createScatterPlot = createScatterPlot;
  ProgramClass.prototype.createLinePlot = createLinePlot;
  ProgramClass.prototype.createParallelCoordinates = createParallelCoordinates;
  ProgramClass.prototype.createPiePlot = createPiePlot;
}
