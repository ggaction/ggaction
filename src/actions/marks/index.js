import { registerBarMarkActions } from "./bar/index.js";
import { registerAreaMarkActions } from "./area/index.js";
import { registerArcMarkActions } from "./arc/index.js";
import { registerLineMarkActions } from "./line/index.js";
import {
  registerPointJitterActions,
  registerPointMarkActions
} from "./point/index.js";
import { registerRectMarkActions } from "./rect/index.js";
import { registerRuleMarkActions } from "./rule/index.js";
import { registerTextMarkActions } from "./text/index.js";
import { registerTickMarkActions } from "./tick/index.js";
import { removeMark } from "./remove.js";

export function registerMarkActions(ProgramClass) {
  registerPointMarkActions(ProgramClass);
  registerPointJitterActions(ProgramClass);
  registerRectMarkActions(ProgramClass);
  registerAreaMarkActions(ProgramClass);
  registerArcMarkActions(ProgramClass);
  registerLineMarkActions(ProgramClass);
  registerBarMarkActions(ProgramClass);
  registerRuleMarkActions(ProgramClass);
  registerTextMarkActions(ProgramClass);
  registerTickMarkActions(ProgramClass);
  ProgramClass.prototype.removeMark = removeMark;
}
