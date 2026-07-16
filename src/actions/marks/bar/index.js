import { createBarMark } from "./create.js";
import { editBarMark } from "./edit.js";
import { rematerializeBarMark } from "./materialize.js";

export function registerBarMarkActions(ProgramClass) {
  ProgramClass.prototype.createBarMark = createBarMark;
  ProgramClass.prototype.editBarMark = editBarMark;
  ProgramClass.prototype.rematerializeBarMark = rematerializeBarMark;
}
