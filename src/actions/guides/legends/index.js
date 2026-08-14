import { registerContinuousLegendActions } from "./continuous/index.js";
import { registerCategoricalLegendActions } from "./categorical/index.js";
import { registerSizeLegendActions } from "./size.js";
import { registerStrokeWidthLegendActions } from "./strokeWidth.js";
import { registerFocusedLegendActions } from "./focused.js";
import { removeLegend } from "./remove.js";

export function registerLegendActions(ProgramClass) {
  registerCategoricalLegendActions(ProgramClass);
  registerContinuousLegendActions(ProgramClass);
  registerSizeLegendActions(ProgramClass);
  registerStrokeWidthLegendActions(ProgramClass);
  registerFocusedLegendActions(ProgramClass);
  ProgramClass.prototype.removeLegend = removeLegend;
}
