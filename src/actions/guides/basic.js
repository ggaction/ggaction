import { registerBasicCartesianAxisActions } from "./axes/index.js";
import { registerGuideCollectionActions } from "./guides.js";
import { registerBasicGridActions } from "./grids/index.js";
import {
  registerBasicCategoricalLegendActions
} from "./legends/categorical/index.js";
import {
  registerIntervalLegendActions,
  registerGradientLegendActions
} from "./legends/continuous/index.js";
import { registerSizeLegendActions } from "./legends/size.js";

export function registerBasicGuideActions(ProgramClass) {
  registerBasicCartesianAxisActions(ProgramClass);
  registerBasicCategoricalLegendActions(ProgramClass);
  registerGradientLegendActions(ProgramClass);
  registerIntervalLegendActions(ProgramClass);
  registerSizeLegendActions(ProgramClass);
  registerBasicGridActions(ProgramClass);
  registerGuideCollectionActions(ProgramClass);
}
