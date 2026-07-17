import { createErrorBand } from "./create.js";
import { createErrorBandBoundary } from "./components.js";
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
