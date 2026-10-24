import { cloneAndFreeze, isPlainObject } from "./immutable.js";
import { annotateError } from "./diagnostics.js";
export function validateCompositionSpacing(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
  return value;
}

/** Keep scalar intent intact; a facet pair always declares both axes. */
export function normalizeFacetGap(value, label = "Facet gap") {
  if (!isPlainObject(value)) return validateCompositionSpacing(value, label);
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 2 || !keys.includes("x") || !keys.includes("y")) {
    throw annotateError(new TypeError(`${label} must contain exactly x and y.`), {
      code: "invalid-value", optionPath: "gap", actual: value
    });
  }
  const result = {};
  for (const axis of ["x", "y"]) {
    try {
      result[axis] = validateCompositionSpacing(value[axis], `${label}.${axis}`);
    } catch (error) {
      throw annotateError(error, {
        code: "invalid-value", optionPath: `gap.${axis}`, actual: value[axis], limit: 0
      });
    }
  }
  return cloneAndFreeze(result);
}

/** Accept only a previously normalized scalar or pair. */
export function facetGapAxis(gap, axis) {
  return typeof gap === "number" ? gap : gap[axis];
}

/** Overflow remains axis-specific for a pair; scalar callers keep their old error. */
export function assertFacetGapFinite(gap, axis, values, message) {
  if (values.every(Number.isFinite)) return;
  const error = new RangeError(message);
  throw typeof gap === "number" ? error : annotateError(error, {
    code: "invalid-value", optionPath: `gap.${axis}`, actual: gap[axis]
  });
}
