import { isPlainObject } from "../core/immutable.js";
import { validateBoxTransform } from "./boxPlot.js";
import { validateDensityTransform } from "./density.js";
import { validateFilterTransform } from "./filter.js";
import { validateIntervalTransform } from "./interval.js";
import { validateMarkFilterTransform } from "./markFilter.js";
import { validateRegressionTransform } from "./regression/index.js";

const TRANSFORM_VALIDATORS = Object.freeze({
  boxOutlier: validateBoxTransform,
  boxSummary: validateBoxTransform,
  density: validateDensityTransform,
  filter: validateFilterTransform,
  interval: validateIntervalTransform,
  markFilter: validateMarkFilterTransform,
  regression: validateRegressionTransform
});

export function findTransformValidator(type) {
  return TRANSFORM_VALIDATORS[type];
}

export function validateDatasetTransforms(value) {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isPlainObject)) {
    throw new TypeError(
      "Dataset transform must be a non-empty array of plain objects."
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
