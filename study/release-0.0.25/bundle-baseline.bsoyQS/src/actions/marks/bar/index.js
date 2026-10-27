import { createBarMark } from "./create.js";
import { editBarMark } from "./edit.js";
import { rematerializeBarMark } from "./materialize.js";

export function registerBarMarkActions(ProgramClass) {
  ProgramClass.prototype.editBarMark = editBarMark;
  registerBasicBarMarkActions(ProgramClass);
}

export function registerBasicBarMarkActions(ProgramClass) {
  ProgramClass.prototype.createBarMark = createBarMark;
  ProgramClass.prototype.rematerializeBarMark = rematerializeBarMark;
}
