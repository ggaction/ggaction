import { registerBarMarkActions } from "./bar/index.js";
import { registerLineMarkActions } from "./line/index.js";
import { registerPointMarkActions } from "./point/index.js";
import { registerRectMarkActions } from "./rect/index.js";

export function registerBasicMarkActions(ProgramClass) {
  registerPointMarkActions(ProgramClass);
  registerLineMarkActions(ProgramClass);
  registerBarMarkActions(ProgramClass);
  registerRectMarkActions(ProgramClass);
}
