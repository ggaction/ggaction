import { registerActionTargetDispatcher } from "../../core/action.js";
import { dispatchActionTargets } from "./targets.js";
import { registerCompositionActions as registerStructureActions } from "./actions.js";
import { registerAdjacentPlotActions } from "./adjacent.js";
import { registerLayerPlotActions } from "./layer.js";
export function registerCompositionActions(ProgramClass) {
  registerActionTargetDispatcher(ProgramClass, dispatchActionTargets);
  registerStructureActions(ProgramClass);
  registerAdjacentPlotActions(ProgramClass);
  registerLayerPlotActions(ProgramClass);
}
