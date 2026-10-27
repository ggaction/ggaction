import { registerSeriesLayoutAction } from "./seriesLayout.js";
import { registerBasicAppearanceEncodingActions } from "./appearance.js";
import { registerBarWidthEncodingAction } from "./barWidth.js";
import { registerColorEncodingAction } from "./color/index.js";
import { registerHistogramEncodingAction } from "./histogram.js";
import { registerOffsetEncodingAction } from "./offset.js";
import {
  registerCartesianPositionEncodingActions
} from "./position/index.js";
import { registerBasicRangedEncodingActions } from "./ranged.js";
import { registerStrokeDashEncodingActions } from "./strokeDash.js";

export function registerBasicEncodingActions(ProgramClass) {
  registerSeriesLayoutAction(ProgramClass);
  registerCartesianPositionEncodingActions(ProgramClass);
  registerBasicRangedEncodingActions(ProgramClass);
  registerColorEncodingAction(ProgramClass);
  registerBasicAppearanceEncodingActions(ProgramClass);
  registerStrokeDashEncodingActions(ProgramClass);
  registerOffsetEncodingAction(ProgramClass);
  registerHistogramEncodingAction(ProgramClass);
  registerBarWidthEncodingAction(ProgramClass);
}
