import {
  createRadialAxis,
  createThetaAxis,
  editRadialAxis,
  editThetaAxis
} from "./facade.js";
import {
  createRadialAxisLabels,
  createThetaAxisLabels,
  editRadialAxisLabels,
  editThetaAxisLabels
} from "./labels.js";
import {
  createRadialAxisLine,
  createThetaAxisLine,
  editRadialAxisLine,
  editThetaAxisLine
} from "./lines.js";
import {
  createRadialAxisTicks,
  createThetaAxisTicks,
  editRadialAxisTicks,
  editThetaAxisTicks
} from "./ticks.js";
import {
  createRadialAxisTitle,
  createThetaAxisTitle,
  editRadialAxisTitle,
  editThetaAxisTitle
} from "./titles.js";

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
