import {
  createGradientPlotCenter,
  createGradientPlotLegend,
  rematerializeGradientPlotLegend
} from "./components.js";
import { createGradientPlot } from "./create.js";
import { editGradientPlot } from "./edit.js";
import {
  materializeGradientPlot,
  materializeGradientPlotFill
} from "./materialize.js";
import { rebindGradientPlotProfile } from "./rebind.js";

export function registerGradientPlotActions(ProgramClass) {
  ProgramClass.prototype.createGradientPlot = createGradientPlot;
  ProgramClass.prototype.editGradientPlot = editGradientPlot;
  ProgramClass.prototype.materializeGradientPlot = materializeGradientPlot;
  ProgramClass.prototype.materializeGradientPlotFill = materializeGradientPlotFill;
  ProgramClass.prototype.createGradientPlotCenter = createGradientPlotCenter;
  ProgramClass.prototype.createGradientPlotLegend = createGradientPlotLegend;
  ProgramClass.prototype.rematerializeGradientPlotLegend =
    rematerializeGradientPlotLegend;
  ProgramClass.prototype.rebindGradientPlotProfile = rebindGradientPlotProfile;
}
