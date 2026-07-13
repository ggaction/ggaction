import { registerAppearanceEncodingAction } from "./appearance.js";
import { registerBarWidthEncodingAction } from "./barWidth.js";
import { registerCategoricalEncodingActions } from "./categorical.js";
import { registerHistogramEncodingAction } from "./histogram.js";
import { registerOffsetEncodingAction } from "./offset.js";
import { registerPositionEncodingActions } from "./position.js";

export function registerEncodingActions(ProgramClass) {
  registerPositionEncodingActions(ProgramClass);
  registerOffsetEncodingAction(ProgramClass);
  registerBarWidthEncodingAction(ProgramClass);
  registerHistogramEncodingAction(ProgramClass);
  registerCategoricalEncodingActions(ProgramClass);
  registerAppearanceEncodingAction(ProgramClass);
}
