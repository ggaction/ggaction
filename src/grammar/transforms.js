import { isPlainObject } from "../core/immutable.js";
import { validateBoxTransform } from "./boxPlot.js";
import {
  requestedBin2DTransform,
  validateBin2DTransform
} from "./bin2d.js";
import { validateDensityTransform } from "./density.js";
import { validateFilterTransform } from "./filter.js";
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
  const extent = Math.max(...transform.resolved.extents.map(item => item.extent));
  if (!(extent > 0)) return transform;
  return {
    ...requestedHorizonTransform(transform),
    extent
  };
}

const TRANSFORM_POLICIES = Object.freeze({
  bin2d: Object.freeze({
    validate: validateBin2DTransform,
    materializeOp: "materializeBin2DData",
    facetTopology: "statistical",
    replayTransform: requestedBin2DTransform
  }),
  boxOutlier: Object.freeze({
    validate: validateBoxTransform,
    materializeOp: "materializeBoxOutlierData",
    facetTopology: "statistical"
  }),
  boxSummary: Object.freeze({
    validate: validateBoxTransform,
    materializeOp: "materializeBoxSummaryData",
    facetTopology: "statistical"
  }),
  density: Object.freeze({
    validate: validateDensityTransform,
    materializeOp: "materializeDensityData",
    facetTopology: "statistical",
    replayTransform: requestedDensityTransform
  }),
  filter: Object.freeze({
    validate: validateFilterTransform,
    materializeOp: "materializeFilteredData",
    facetTopology: "rowPreserving"
  }),
  gradientProfile: Object.freeze({
    validate: validateGradientProfileTransform,
    materializeOp: "materializeGradientProfileData",
    facetTopology: "statistical",
    replayTransform: requestedGradientProfileTransform
  }),
  horizon: Object.freeze({
    validate: validateHorizonTransform,
    materializeOp: "materializeHorizonData",
    facetTopology: "statistical",
    replayTransform: requestedHorizonTransform,
    facetReplayTransform: facetHorizonTransform
  }),
  interval: Object.freeze({
    validate: validateIntervalTransform,
    materializeOp: "materializeIntervalData",
    facetTopology: "statistical"
  }),
  markFilter: Object.freeze({
    validate: validateMarkFilterTransform,
    materializeOp: "materializeMarkFilteredData",
    provenanceTransparent: true
  }),
  regression: Object.freeze({
    validate: validateRegressionTransform,
    materializeOp: "materializeRegressionData",
    facetTopology: "statistical"
  }),
  window: Object.freeze({
    validate: validateWindowTransform,
    materializeOp: "materializeWindowData",
    facetTopology: "statistical"
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
