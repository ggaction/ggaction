import {
  createRegressionBand,
  createRegressionLine,
  editRegressionBand,
  editRegressionLine
} from "./components.js";
import { createRegression } from "./create.js";

export {
  createRegressionBand,
  createRegressionLine,
  editRegressionBand,
  editRegressionLine
} from "./components.js";
export { createRegression } from "./create.js";

export function registerRegressionActions(ProgramClass) {
  ProgramClass.prototype.createRegressionBand = createRegressionBand;
  ProgramClass.prototype.createRegressionLine = createRegressionLine;
  ProgramClass.prototype.editRegressionBand = editRegressionBand;
  ProgramClass.prototype.editRegressionLine = editRegressionLine;
  ProgramClass.prototype.createRegression = createRegression;
}
