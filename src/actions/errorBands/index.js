import { createErrorBand } from "./create.js";
import { createErrorBandBoundary } from "./components.js";

export function registerErrorBandActions(ProgramClass) {
  ProgramClass.prototype.createErrorBand = createErrorBand;
  ProgramClass.prototype.createErrorBandBoundary = createErrorBandBoundary;
}
