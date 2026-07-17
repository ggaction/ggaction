import { createErrorBarCap } from "./components.js";
import { createErrorBar } from "./create.js";
import { editErrorBar, rematerializeErrorBar } from "./edit.js";

export function registerErrorBarActions(ProgramClass) {
  ProgramClass.prototype.createErrorBarCap = createErrorBarCap;
  ProgramClass.prototype.createErrorBar = createErrorBar;
  ProgramClass.prototype.editErrorBar = editErrorBar;
  ProgramClass.prototype.rematerializeErrorBar = rematerializeErrorBar;
}
