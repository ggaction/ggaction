import { registerBarMarkActions } from "./barMarks.js";
import { registerLineMarkActions } from "./lineMarks.js";
import { registerPointMarkActions } from "./pointMarks.js";

export function registerMarkActions(ProgramClass) {
  registerPointMarkActions(ProgramClass);
  registerLineMarkActions(ProgramClass);
  registerBarMarkActions(ProgramClass);
}
