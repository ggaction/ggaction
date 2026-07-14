import { createGradientLegend, rematerializeGradientLegend } from "./gradient.js";
import {
  createOpacityLegend,
  rematerializeOpacityLegend,
  removeOpacityLegend
} from "./opacity.js";

export { createGradientLegend, rematerializeGradientLegend } from "./gradient.js";
export {
  createOpacityLegend,
  rematerializeOpacityLegend,
  removeOpacityLegend
} from "./opacity.js";

export function registerContinuousLegendActions(ProgramClass) {
  ProgramClass.prototype.createGradientLegend = createGradientLegend;
  ProgramClass.prototype.rematerializeGradientLegend = rematerializeGradientLegend;
  ProgramClass.prototype.createOpacityLegend = createOpacityLegend;
  ProgramClass.prototype.rematerializeOpacityLegend = rematerializeOpacityLegend;
  ProgramClass.prototype.removeOpacityLegend = removeOpacityLegend;
}
