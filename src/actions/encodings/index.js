import { registerDensityEncodingAction } from "./density.js";
import { registerPathOrderEncodingActions } from "./pathOrder.js";
import { registerHorizonEncodingAction } from "./horizon.js";
import { registerHistogramEncodingAction } from "./histogram.js";
import { registerPositionEncodingActions } from "./position/index.js";
import { registerRangedEncodingActions } from "./ranged.js";
import { registerAngleEncodingAction } from "./angle.js";
import { registerOffsetEncodingAction } from "./offset.js";
import { registerParallelEncodingAction } from "./parallel.js";
import { registerColorEncodingAction } from "./color/index.js";
import { registerTextEncodingAction } from "./text.js";
import { registerAppearanceEncodingAction } from "./appearance.js";
import { registerStrokeDashEncodingActions } from "./strokeDash.js";
import { registerRuleAppearanceEncodingActions } from "./ruleAppearance.js";
import { registerBarWidthEncodingAction } from "./barWidth.js";
import { registerEncodingRemovalAction } from "./remove.js";

export function registerEncodingActions(ProgramClass) {
  registerPositionEncodingActions(ProgramClass);
  registerRangedEncodingActions(ProgramClass);
  registerOffsetEncodingAction(ProgramClass);
  registerPathOrderEncodingActions(ProgramClass);
  registerBarWidthEncodingAction(ProgramClass);
  registerHistogramEncodingAction(ProgramClass);
  registerHorizonEncodingAction(ProgramClass);
  registerDensityEncodingAction(ProgramClass);
  registerColorEncodingAction(ProgramClass);
  registerStrokeDashEncodingActions(ProgramClass);
  registerAppearanceEncodingAction(ProgramClass);
  registerAngleEncodingAction(ProgramClass);
  registerRuleAppearanceEncodingActions(ProgramClass);
  registerTextEncodingAction(ProgramClass);
  registerParallelEncodingAction(ProgramClass);
  registerEncodingRemovalAction(ProgramClass);
}
