import {
  createTimeUnitData,
  materializeTimeUnitData
} from "./timeUnit.js";
import {
  createDerivedData,
  bindMarkData,
  rebindLayerData,
  releaseDerivedData
} from "./derived.js";
import {
  filterData,
  filterMarks,
  materializeEmptyMark,
  removeMarkFilter,
  materializeFilteredData,
  materializeMarkFilteredData
} from "./filter.js";
import {
  createGradientProfileData,
  materializeGradientProfileData
} from "./gradientProfile.js";
import { createRegressionData, materializeRegressionData } from "./regression.js";
import {
  createCategoricalDensityData,
  createDensityData,
  materializeDensityData
} from "./density.js";
import { createIntervalData, materializeIntervalData } from "./interval.js";
import { createECDFData, materializeECDFData } from "./ecdf.js";
import { createHorizonData, materializeHorizonData } from "./horizon.js";
import {
  createBin2DData,
  editBin2DData,
  materializeBin2DData
} from "./bin2d.js";
import { createData } from "./create.js";
import { createWindowData, materializeWindowData } from "./window.js";
import { createSummaryData, materializeSummaryData } from "./summary.js";
import { createBinData, materializeBinData } from "./bin.js";
import { createFoldData, materializeFoldData } from "./fold.js";
import { createComputedData, materializeComputedData } from "./computed.js";
import { createStackData, materializeStackData } from "./stack.js";
import { createBoxSummaryData, createBoxOutlierData, materializeBoxSummaryData, materializeBoxOutlierData } from "./box.js";

export function registerDataActions(ProgramClass) {
  ProgramClass.prototype.createData = createData;
  ProgramClass.prototype.createDerivedData = createDerivedData;
  ProgramClass.prototype.bindMarkData = bindMarkData;
  ProgramClass.prototype.releaseDerivedData = releaseDerivedData;
  ProgramClass.prototype.rebindLayerData = rebindLayerData;
  ProgramClass.prototype.createDensityData = createDensityData;
  ProgramClass.prototype.createCategoricalDensityData =
    createCategoricalDensityData;
  ProgramClass.prototype.materializeFilteredData = materializeFilteredData;
  ProgramClass.prototype.materializeMarkFilteredData = materializeMarkFilteredData;
  ProgramClass.prototype.filterData = filterData;
  ProgramClass.prototype.filterMarks = filterMarks;
  ProgramClass.prototype.materializeEmptyMark = materializeEmptyMark;
  ProgramClass.prototype.removeMarkFilter = removeMarkFilter;
  ProgramClass.prototype.materializeRegressionData = materializeRegressionData;
  ProgramClass.prototype.materializeDensityData = materializeDensityData;
  ProgramClass.prototype.createGradientProfileData = createGradientProfileData;
  ProgramClass.prototype.materializeGradientProfileData =
    materializeGradientProfileData;
  ProgramClass.prototype.createRegressionData = createRegressionData;
  ProgramClass.prototype.materializeIntervalData = materializeIntervalData;
  ProgramClass.prototype.createIntervalData = createIntervalData;
  ProgramClass.prototype.createECDFData = createECDFData;
  ProgramClass.prototype.materializeECDFData = materializeECDFData;
  ProgramClass.prototype.createHorizonData = createHorizonData;
  ProgramClass.prototype.materializeHorizonData = materializeHorizonData;
  ProgramClass.prototype.createWindowData = createWindowData;
  ProgramClass.prototype.materializeWindowData = materializeWindowData;
  ProgramClass.prototype.createSummaryData = createSummaryData;
  ProgramClass.prototype.materializeSummaryData = materializeSummaryData;
  ProgramClass.prototype.createBinData = createBinData;
  ProgramClass.prototype.materializeBinData = materializeBinData;
  ProgramClass.prototype.createFoldData = createFoldData;
  ProgramClass.prototype.materializeFoldData = materializeFoldData;
  ProgramClass.prototype.createComputedData = createComputedData;
  ProgramClass.prototype.materializeComputedData = materializeComputedData;
  ProgramClass.prototype.createStackData = createStackData;
  ProgramClass.prototype.materializeStackData = materializeStackData;
  ProgramClass.prototype.createTimeUnitData = createTimeUnitData;
  ProgramClass.prototype.materializeTimeUnitData = materializeTimeUnitData;
  ProgramClass.prototype.createBin2DData = createBin2DData;
  ProgramClass.prototype.editBin2DData = editBin2DData;
  ProgramClass.prototype.materializeBin2DData = materializeBin2DData;
  ProgramClass.prototype.createBoxSummaryData = createBoxSummaryData;
  ProgramClass.prototype.createBoxOutlierData = createBoxOutlierData;
  ProgramClass.prototype.materializeBoxSummaryData = materializeBoxSummaryData;
  ProgramClass.prototype.materializeBoxOutlierData = materializeBoxOutlierData;
}
