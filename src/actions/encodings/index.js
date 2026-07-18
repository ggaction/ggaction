import { registerAppearanceEncodingAction } from "./appearance.js";
import { registerBarWidthEncodingAction } from "./barWidth.js";
import { registerColorEncodingAction } from "./color.js";
import { registerDensityEncodingAction } from "./density.js";
import { registerHistogramEncodingAction } from "./histogram.js";
import { registerOffsetEncodingAction } from "./offset.js";
import { registerPositionEncodingActions } from "./position.js";
import { registerRangedEncodingActions } from "./ranged.js";
import { registerStrokeDashEncodingActions } from "./strokeDash.js";
import { registerRuleAppearanceEncodingActions } from "./ruleAppearance.js";
import { registerTextEncodingAction } from "./text.js";

export function registerEncodingActions(ProgramClass) {
  registerPositionEncodingActions(ProgramClass);
  registerRangedEncodingActions(ProgramClass);
  registerOffsetEncodingAction(ProgramClass);
  registerBarWidthEncodingAction(ProgramClass);
  registerHistogramEncodingAction(ProgramClass);
  registerDensityEncodingAction(ProgramClass);
  registerColorEncodingAction(ProgramClass);
  registerStrokeDashEncodingActions(ProgramClass);
  registerAppearanceEncodingAction(ProgramClass);
  registerRuleAppearanceEncodingActions(ProgramClass);
  registerTextEncodingAction(ProgramClass);
}
