import { isPlainObject } from "../core/immutable.js";
import { validateBoxTransform } from "./boxPlot.js";
import { validateBinTransform } from "./bin.js";
import {
  requestedBin2DTransform,
  validateBin2DTransform
} from "./bin2d.js";
import { validateDensityTransform } from "./density.js";
import { validateFilterTransform } from "./filter.js";
import { validateFoldTransform } from "./fold.js";
import {
  requestedGradientProfileTransform,
  validateGradientProfileTransform
} from "./gradientProfile.js";
import { validateIntervalTransform } from "./interval.js";
import {
  requestedHorizonTransform,
  validateHorizonTransform
} from "./horizon.js";
import { validateMarkFilterTransform } from "./markFilter.js";
import { validateRegressionTransform } from "./regression/index.js";
import { validateWindowTransform } from "./window.js";
import { validateTimeUnitTransform } from "./timeUnit.js";
import { validateSummaryTransform } from "./summary.js";
import { findTransformTopology } from "./transformTopology.js";

function requestedDensityTransform(transform) {
  const { resolved: _resolved, ...requested } = transform;
  return requested;
}

function facetHorizonTransform(transform, { scales = {} } = {}) {
  if (
    transform.extent !== "auto" ||
    (scales.y ?? "shared") !== "shared" ||
    !Array.isArray(transform.resolved?.extents)
  ) return transform;
  let extent = -Infinity;
  for (const item of transform.resolved.extents) {
    extent = Math.max(extent, item.extent);
  }
  if (!(extent > 0)) return transform;
  return {
    ...requestedHorizonTransform(transform),
    extent
  };
}

const TRANSFORM_POLICIES = Object.freeze({
  bin: Object.freeze({
    ...findTransformTopology("bin"),
    validate: validateBinTransform,
    materializeOp: "materializeBinData"
  }),
  bin2d: Object.freeze({
    ...findTransformTopology("bin2d"),
    validate: validateBin2DTransform,
    materializeOp: "materializeBin2DData",
    replayTransform: requestedBin2DTransform
  }),
  boxOutlier: Object.freeze({
    ...findTransformTopology("boxOutlier"),
    validate: validateBoxTransform,
    materializeOp: "materializeBoxOutlierData"
  }),
  boxSummary: Object.freeze({
    ...findTransformTopology("boxSummary"),
    validate: validateBoxTransform,
    materializeOp: "materializeBoxSummaryData"
  }),
  density: Object.freeze({
    ...findTransformTopology("density"),
    validate: validateDensityTransform,
    materializeOp: "materializeDensityData",
    replayTransform: requestedDensityTransform
  }),
  filter: Object.freeze({
    ...findTransformTopology("filter"),
    validate: validateFilterTransform,
    materializeOp: "materializeFilteredData"
  }),
  fold: Object.freeze({
    ...findTransformTopology("fold"),
    validate: validateFoldTransform,
    materializeOp: "materializeFoldData"
  }),
  gradientProfile: Object.freeze({
    ...findTransformTopology("gradientProfile"),
    validate: validateGradientProfileTransform,
    materializeOp: "materializeGradientProfileData",
    replayTransform: requestedGradientProfileTransform
  }),
  horizon: Object.freeze({
    ...findTransformTopology("horizon"),
    validate: validateHorizonTransform,
    materializeOp: "materializeHorizonData",
    replayTransform: requestedHorizonTransform,
    facetReplayTransform: facetHorizonTransform
  }),
  interval: Object.freeze({
    ...findTransformTopology("interval"),
    validate: validateIntervalTransform,
    materializeOp: "materializeIntervalData"
  }),
  markFilter: Object.freeze({
    ...findTransformTopology("markFilter"),
    validate: validateMarkFilterTransform,
    materializeOp: "materializeMarkFilteredData"
  }),
  regression: Object.freeze({
    ...findTransformTopology("regression"),
    validate: validateRegressionTransform,
    materializeOp: "materializeRegressionData"
  }),
  summary: Object.freeze({
    ...findTransformTopology("summary"),
    validate: validateSummaryTransform,
    materializeOp: "materializeSummaryData"
  }),
  timeUnit: Object.freeze({
    ...findTransformTopology("timeUnit"),
    validate: validateTimeUnitTransform,
    materializeOp: "materializeTimeUnitData"
  }),
  window: Object.freeze({
    ...findTransformTopology("window"),
    validate: validateWindowTransform,
    materializeOp: "materializeWindowData"
  })
});

export function findTransformPolicy(type) {
  return TRANSFORM_POLICIES[type];
}

export function findTransformValidator(type) {
  return findTransformPolicy(type)?.validate;
}

export function validateDatasetTransforms(value) {
  if (!Array.isArray(value) || value.length !== 1 || !isPlainObject(value[0])) {
    throw new TypeError(
      "Dataset transform must contain exactly one plain object."
    );
  }
  for (const transform of value) {
    const validate = findTransformValidator(transform.type);
    if (validate === undefined) {
      throw new Error(`Unsupported dataset transform "${transform.type}".`);
    }
    validate(transform);
  }
  return value;
}
