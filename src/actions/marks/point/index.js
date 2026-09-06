import { createPointMark } from "./create.js";
import { editPointMark } from "./edit.js";
import { rematerializePointMark } from "./materialize.js";

export { registerPointJitterActions } from "./jitter.js";
export { registerPointPackingActions } from "./packing.js";

export function registerPointMarkActions(ProgramClass) {
  ProgramClass.prototype.editPointMark = editPointMark;
  registerBasicPointMarkActions(ProgramClass);
}

export function registerBasicPointMarkActions(ProgramClass) {
  ProgramClass.prototype.createPointMark = createPointMark;
  ProgramClass.prototype.rematerializePointMark = rematerializePointMark;
}
