import { createBarMark } from "./create.js";
import { rematerializeBarMark } from "./materialize.js";

export function registerBarMarkActions(ProgramClass) {
  ProgramClass.prototype.createBarMark = createBarMark;
  ProgramClass.prototype.rematerializeBarMark = rematerializeBarMark;
}
