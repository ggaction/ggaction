import { createData } from "./create.js";
import { createDerivedData } from "./derived.js";
import { filterData, materializeFilteredData } from "./filter.js";
import { createRegressionData, materializeRegressionData } from "./regression.js";
import { createDensityData, materializeDensityData } from "./density.js";

export function registerDataActions(ProgramClass) {
  ProgramClass.prototype.createData = createData;
  ProgramClass.prototype.createDerivedData = createDerivedData;
  ProgramClass.prototype.createDensityData = createDensityData;
  ProgramClass.prototype.materializeFilteredData = materializeFilteredData;
  ProgramClass.prototype.filterData = filterData;
  ProgramClass.prototype.materializeRegressionData = materializeRegressionData;
  ProgramClass.prototype.materializeDensityData = materializeDensityData;
  ProgramClass.prototype.createRegressionData = createRegressionData;
}
