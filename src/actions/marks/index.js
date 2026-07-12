import { registerBarMarkActions } from "./bar.js";
import { registerLineMarkActions } from "./line.js";
import { registerPointMarkActions } from "./point.js";

export function registerMarkActions(ProgramClass) {
  registerPointMarkActions(ProgramClass);
  registerLineMarkActions(ProgramClass);
  registerBarMarkActions(ProgramClass);
}
