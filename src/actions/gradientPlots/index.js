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
  Object.assign(ProgramClass.prototype, {
    createGradientPlot,
    editGradientPlot,
    materializeGradientPlot,
    materializeGradientPlotFill,
    createGradientPlotCenter,
    createGradientPlotLegend,
    rematerializeGradientPlotLegend,
    rebindGradientPlotProfile
  });
}
