import { createGradientLegend, rematerializeGradientLegend } from "./gradient.js";
import {
  createOpacityLegend,
  rematerializeOpacityLegend,
  removeOpacityLegend
} from "./opacity.js";
import { createIntervalLegend, rematerializeIntervalLegend } from "./interval.js";

export { createGradientLegend, rematerializeGradientLegend } from "./gradient.js";
export {
  createOpacityLegend,
  rematerializeOpacityLegend,
  removeOpacityLegend
} from "./opacity.js";
export { createIntervalLegend, rematerializeIntervalLegend } from "./interval.js";

export function registerContinuousLegendActions(ProgramClass) {
  registerGradientLegendActions(ProgramClass);
  ProgramClass.prototype.createOpacityLegend = createOpacityLegend;
  ProgramClass.prototype.rematerializeOpacityLegend = rematerializeOpacityLegend;
  ProgramClass.prototype.removeOpacityLegend = removeOpacityLegend;
  registerIntervalLegendActions(ProgramClass);
}

export function registerGradientLegendActions(ProgramClass) {
  ProgramClass.prototype.createGradientLegend = createGradientLegend;
  ProgramClass.prototype.rematerializeGradientLegend = rematerializeGradientLegend;
}

export function registerIntervalLegendActions(ProgramClass) {
  ProgramClass.prototype.createIntervalLegend = createIntervalLegend;
  ProgramClass.prototype.rematerializeIntervalLegend = rematerializeIntervalLegend;
}
