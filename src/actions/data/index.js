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
import { createRegressionStatisticsData, editRegressionStatisticsData, materializeRegressionStatisticsData } from "./regressionStatistics.js";
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
import { createParameter } from "../parameters/create.js";
import { editParameter, removeParameter } from "../parameters/edit.js";
import { reviseData } from "./revise.js";
import { createWindowData, materializeWindowData } from "./window.js";
import { createSummaryData, materializeSummaryData } from "./summary.js";
import { createBinData, materializeBinData } from "./bin.js";
import { createFoldData, materializeFoldData } from "./fold.js";
import { createFlattenData, materializeFlattenData } from "./flatten.js";
import {createLookupData,materializeLookupData} from "./lookup.js";
import { createComputedData, materializeComputedData } from "./computed.js";
import {
  createNormalizedData,
  materializeNormalizedData
} from "./normalize.js";
import { createCompleteData, materializeCompleteData } from "./complete.js";
import { createImputedData, materializeImputedData } from "./impute.js";
import { createStackData, materializeStackData } from "./stack.js";
import { createSortedData, materializeSortedData } from "./sort.js";
import { EDIT_DERIVED_DATA_ACTIONS } from "./edit.js";
import { createBoxSummaryData, createBoxOutlierData, materializeBoxSummaryData, materializeBoxOutlierData } from "./box.js";

export function registerDataActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, EDIT_DERIVED_DATA_ACTIONS, {
    createData,
    createParameter,
    editParameter,
    removeParameter,
    reviseData,
    createDerivedData,
    bindMarkData,
    releaseDerivedData,
    rebindLayerData,
    createDensityData,
    createCategoricalDensityData,
    materializeFilteredData,
    materializeMarkFilteredData,
    filterData,
    filterMarks,
    materializeEmptyMark,
    removeMarkFilter,
    materializeRegressionData,
    materializeRegressionStatisticsData,
    createRegressionStatisticsData,
    editRegressionStatisticsData,
    materializeDensityData,
    createGradientProfileData,
    materializeGradientProfileData,
    createRegressionData,
    materializeIntervalData,
    createIntervalData,
    createECDFData,
    materializeECDFData,
    createHorizonData,
    materializeHorizonData,
    createWindowData,
    materializeWindowData,
    createSummaryData,
    materializeSummaryData,
    createBinData,
    materializeBinData,
    createFlattenData,
    materializeFlattenData,
    createLookupData,
    materializeLookupData,
    createFoldData,
    materializeFoldData,
    createComputedData,
    materializeComputedData,
    createNormalizedData,
    materializeNormalizedData,
    createCompleteData,
    materializeCompleteData,
    createImputedData,
    materializeImputedData,
    createStackData,
    materializeStackData,
    createSortedData,
    materializeSortedData,
    createTimeUnitData,
    materializeTimeUnitData,
    createBin2DData,
    editBin2DData,
    materializeBin2DData,
    createBoxSummaryData,
    createBoxOutlierData,
    materializeBoxSummaryData,
    materializeBoxOutlierData
  });
}
