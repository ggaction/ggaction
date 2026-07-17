import {
  createRadialAxis,
  createThetaAxis,
  editRadialAxis,
  editThetaAxis
} from "./axes/facade.js";
import {
  createRadialAxisLabels,
  createThetaAxisLabels,
  editRadialAxisLabels,
  editThetaAxisLabels
} from "./axes/labels.js";
import {
  createRadialAxisLine,
  createThetaAxisLine,
  editRadialAxisLine,
  editThetaAxisLine
} from "./axes/lines.js";
import {
  createRadialAxisTicks,
  createThetaAxisTicks,
  editRadialAxisTicks,
  editThetaAxisTicks
} from "./axes/ticks.js";
import {
  createRadialAxisTitle,
  createThetaAxisTitle,
  editRadialAxisTitle,
  editThetaAxisTitle
} from "./axes/titles.js";

export function registerPolarAxisActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, {
    createThetaAxisLine,
    createRadialAxisLine,
    editThetaAxisLine,
    editRadialAxisLine,
    createThetaAxisTicks,
    createRadialAxisTicks,
    editThetaAxisTicks,
    editRadialAxisTicks,
    createThetaAxisLabels,
    createRadialAxisLabels,
    editThetaAxisLabels,
    editRadialAxisLabels,
    createThetaAxisTitle,
    createRadialAxisTitle,
    editThetaAxisTitle,
    editRadialAxisTitle,
    createThetaAxis,
    createRadialAxis,
    editThetaAxis,
    editRadialAxis
  });
}
