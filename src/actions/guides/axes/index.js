import { registerCompleteAxisEditActions } from "./edit.js";
import { registerAxisLabelActions } from "./labels.js";
import { registerAxisLineActions } from "./lines.js";
import { registerAxisTickGroupActions } from "./tickGroups.js";
import { registerAxisTickActions } from "./ticks.js";
import { registerAxisTitleActions } from "./titles.js";
import { registerAxisActions } from "./axis.js";
import {
  removeRadialAxis,
  removeThetaAxis,
  removeXAxis,
  removeYAxis
} from "./remove.js";
import { registerAxisCollectionActions } from "./axes.js";
import { registerParallelAxisActions } from "./parallel.js";

export function registerBasicCartesianAxisActions(ProgramClass) {
  registerAxisLineActions(ProgramClass);
  registerAxisTickActions(ProgramClass);
  registerAxisLabelActions(ProgramClass);
  registerAxisTickGroupActions(ProgramClass);
  registerAxisTitleActions(ProgramClass);
  registerAxisActions(ProgramClass);
  registerAxisCollectionActions(ProgramClass);
}

export function registerCartesianAxisActions(ProgramClass) {
  registerBasicCartesianAxisActions(ProgramClass);
  registerCompleteAxisEditActions(ProgramClass);
  ProgramClass.prototype.removeXAxis = removeXAxis;
  ProgramClass.prototype.removeYAxis = removeYAxis;
}

export function registerGuideAxisActions(ProgramClass) {
  registerCartesianAxisActions(ProgramClass);
  registerParallelAxisActions(ProgramClass);
  ProgramClass.prototype.removeThetaAxis = removeThetaAxis;
  ProgramClass.prototype.removeRadialAxis = removeRadialAxis;
}
