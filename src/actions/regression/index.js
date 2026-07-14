import { createRegressionBand, createRegressionLine } from "./components.js";
import { createRegression } from "./create.js";

export { createRegressionBand, createRegressionLine } from "./components.js";
export { createRegression } from "./create.js";

export function registerRegressionActions(ProgramClass) {
  ProgramClass.prototype.createRegressionBand = createRegressionBand;
  ProgramClass.prototype.createRegressionLine = createRegressionLine;
  ProgramClass.prototype.createRegression = createRegression;
}
