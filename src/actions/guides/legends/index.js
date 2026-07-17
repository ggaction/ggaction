import { registerCategoricalLegendActions } from "./categorical/index.js";
import { registerContinuousLegendActions } from "./continuous/index.js";
import { registerSizeLegendActions } from "./size.js";
import { registerFocusedLegendActions } from "./focused.js";

export function registerLegendActions(ProgramClass) {
  registerCategoricalLegendActions(ProgramClass);
  registerContinuousLegendActions(ProgramClass);
  registerSizeLegendActions(ProgramClass);
  registerFocusedLegendActions(ProgramClass);
}
