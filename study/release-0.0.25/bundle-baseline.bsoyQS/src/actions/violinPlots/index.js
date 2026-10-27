import { createViolinPlot } from "./create.js";
import { editViolinPlot } from "./edit.js";

export function registerViolinPlotActions(ProgramClass) {
  ProgramClass.prototype.createViolinPlot = createViolinPlot;
  ProgramClass.prototype.editViolinPlot = editViolinPlot;
}
