import { registerCategoricalLegendActions } from "./categorical/index.js";
import { registerContinuousLegendActions } from "./continuous/index.js";
import { registerSizeLegendActions } from "./size.js";

export function registerLegendActions(ProgramClass) {
  registerCategoricalLegendActions(ProgramClass);
  registerContinuousLegendActions(ProgramClass);
  registerSizeLegendActions(ProgramClass);
}
