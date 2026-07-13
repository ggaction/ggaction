import { createScale } from "./create.js";
import { rematerializeScale } from "./materialize.js";

export function registerScaleActions(ProgramClass) {
  ProgramClass.prototype.createScale = createScale;
  ProgramClass.prototype.rematerializeScale = rematerializeScale;
}
