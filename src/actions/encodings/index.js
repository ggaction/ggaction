import { registerAppearanceEncodingAction } from "./appearance.js";
import { registerCategoricalEncodingActions } from "./categorical.js";
import { registerHistogramEncodingAction } from "./histogram.js";
import { registerPositionEncodingActions } from "./position.js";

export function registerEncodingActions(ProgramClass) {
  registerPositionEncodingActions(ProgramClass);
  registerHistogramEncodingAction(ProgramClass);
  registerCategoricalEncodingActions(ProgramClass);
  registerAppearanceEncodingAction(ProgramClass);
}
