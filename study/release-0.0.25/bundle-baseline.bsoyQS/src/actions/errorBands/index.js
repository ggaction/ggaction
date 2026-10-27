import { createErrorBand, createErrorBandBoundary } from "./create.js";
import {
  editErrorBand,
  editErrorBandBoundary,
  rematerializeErrorBandBoundary
} from "./edit.js";

export function registerErrorBandActions(ProgramClass) {
  ProgramClass.prototype.createErrorBand = createErrorBand;
  ProgramClass.prototype.createErrorBandBoundary = createErrorBandBoundary;
  ProgramClass.prototype.editErrorBand = editErrorBand;
  ProgramClass.prototype.editErrorBandBoundary = editErrorBandBoundary;
  ProgramClass.prototype.rematerializeErrorBandBoundary =
    rematerializeErrorBandBoundary;
}
