import { createScale } from "./create.js";
import { editScale } from "./edit.js";
import { rematerializeScale } from "./materialize.js";
import { setQuantitativeColorScale } from "./quantitativeColor.js";
import { registerChannelScaleActions } from "./channels.js";
import { editParallelScale } from "./parallel.js";

export function registerScaleActions(ProgramClass) {
  ProgramClass.prototype.editScale = editScale;
  ProgramClass.prototype.editParallelScale = editParallelScale;
  registerChannelScaleActions(ProgramClass);
  registerBasicScaleActions(ProgramClass);
}

export function registerBasicScaleActions(ProgramClass) {
  ProgramClass.prototype.createScale = createScale;
  ProgramClass.prototype.rematerializeScale = rematerializeScale;
  ProgramClass.prototype.setQuantitativeColorScale = setQuantitativeColorScale;
}
