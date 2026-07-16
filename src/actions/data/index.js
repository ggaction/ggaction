import { createData } from "./create.js";
import { createDerivedData, releaseDerivedData } from "./derived.js";
import { filterData, filterMark, materializeFilteredData } from "./filter.js";
import { createRegressionData, materializeRegressionData } from "./regression.js";
import { createDensityData, materializeDensityData } from "./density.js";
import { createIntervalData, materializeIntervalData } from "./interval.js";
import { createBoxSummaryData, createBoxOutlierData, materializeBoxSummaryData, materializeBoxOutlierData } from "./box.js";

export function registerDataActions(ProgramClass) {
  ProgramClass.prototype.createData = createData;
  ProgramClass.prototype.createDerivedData = createDerivedData;
  ProgramClass.prototype.releaseDerivedData = releaseDerivedData;
  ProgramClass.prototype.createDensityData = createDensityData;
  ProgramClass.prototype.materializeFilteredData = materializeFilteredData;
  ProgramClass.prototype.filterData = filterData;
  ProgramClass.prototype.filterMark = filterMark;
  ProgramClass.prototype.materializeRegressionData = materializeRegressionData;
  ProgramClass.prototype.materializeDensityData = materializeDensityData;
  ProgramClass.prototype.createRegressionData = createRegressionData;
  ProgramClass.prototype.materializeIntervalData = materializeIntervalData;
  ProgramClass.prototype.createIntervalData = createIntervalData;
  ProgramClass.prototype.createBoxSummaryData = createBoxSummaryData;
  ProgramClass.prototype.createBoxOutlierData = createBoxOutlierData;
  ProgramClass.prototype.materializeBoxSummaryData = materializeBoxSummaryData;
  ProgramClass.prototype.materializeBoxOutlierData = materializeBoxOutlierData;
}
