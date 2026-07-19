import { studentTCriticalValue } from "../statistics/studentT.js";

export {
  REGRESSION_LOWER_FIELD,
  REGRESSION_UPPER_FIELD
} from "./fields.js";
export { deriveLinearRegression, deriveRegression } from "./derive.js";
export {
  normalizeRegressionParameters,
  validateRegressionTransform
} from "./parameters.js";

export function studentTCritical(confidence, degreesOfFreedom) {
  if (!Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) {
    throw new RangeError("Regression confidence must be between 0 and 1.");
  }
  if (!Number.isInteger(degreesOfFreedom) || degreesOfFreedom <= 0) {
    throw new RangeError("Student-t degrees of freedom must be positive.");
  }
  return studentTCriticalValue(confidence, degreesOfFreedom);
}
