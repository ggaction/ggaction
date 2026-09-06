import { createRosePlot, createRadialBarPlot } from "./radial.js";
import { createAreaPlot } from "./area.js";
import { createHeatmap } from "./heatmap.js";
import { createBarPlot } from "./bar.js";
import { createHistogram } from "./histogram.js";
import { createLinePlot } from "./line.js";
import { createScatterPlot } from "./scatter.js";
import { createParallelCoordinates } from "./parallel.js";
import { createPiePlot } from "./pie.js";
import { createDensityPlot } from "./density.js";
import { createHorizonPlot } from "./horizon.js";
import { createPolarLinePlot, createPolarScatterPlot } from "./polar.js";
import { createRadarPlot } from "./radar.js";
import { createRugPlot, createStripPlot } from "./rug-strip.js";
import { createIntervalPlot, createRegressionPlot } from "./interval-regression.js";
import {
  createDotPlot, createLollipopPlot, createDumbbellPlot, editEndpointPlot
} from "./endpoints.js";
import { createECDFPlot, editECDFPlot } from "./ecdf.js";
import { createBeeswarmPlot } from "./beeswarm.js";

export function registerChartActions(ProgramClass) {
  ProgramClass.prototype.createRosePlot = createRosePlot;
  ProgramClass.prototype.createRadialBarPlot = createRadialBarPlot;
  ProgramClass.prototype.createAreaPlot = createAreaPlot;
  ProgramClass.prototype.createBarPlot = createBarPlot;
  ProgramClass.prototype.createHeatmap = createHeatmap;
  ProgramClass.prototype.createHistogram = createHistogram;
  ProgramClass.prototype.createScatterPlot = createScatterPlot;
  ProgramClass.prototype.createLinePlot = createLinePlot;
  ProgramClass.prototype.createParallelCoordinates = createParallelCoordinates;
  ProgramClass.prototype.createPiePlot = createPiePlot;
  ProgramClass.prototype.createDensityPlot = createDensityPlot;
  ProgramClass.prototype.createHorizonPlot = createHorizonPlot;
  ProgramClass.prototype.createPolarScatterPlot = createPolarScatterPlot;
  ProgramClass.prototype.createPolarLinePlot = createPolarLinePlot;
  ProgramClass.prototype.createRadarPlot = createRadarPlot;
  ProgramClass.prototype.createRugPlot = createRugPlot;
  ProgramClass.prototype.createStripPlot = createStripPlot;
  ProgramClass.prototype.createIntervalPlot = createIntervalPlot;
  ProgramClass.prototype.createRegressionPlot = createRegressionPlot;
  ProgramClass.prototype.createDotPlot = createDotPlot;
  ProgramClass.prototype.createLollipopPlot = createLollipopPlot;
  ProgramClass.prototype.createDumbbellPlot = createDumbbellPlot;
  ProgramClass.prototype.editEndpointPlot = editEndpointPlot;
  ProgramClass.prototype.createECDFPlot = createECDFPlot;
  ProgramClass.prototype.editECDFPlot = editECDFPlot;
  ProgramClass.prototype.createBeeswarmPlot = createBeeswarmPlot;
}
