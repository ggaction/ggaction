import { isPlainObject } from "../../core/immutable.js";
import {
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../core/validation.js";
import { validateCurveInterpolation } from "../../grammar/curveCommands.js";
import { normalizeStrokeDashPattern } from "../../grammar/scales.js";

export const ERROR_BAND_BOUNDARY_OPTIONS = Object.freeze([
  "stroke", "strokeWidth", "strokeDash", "opacity", "curve"
]);

export function resolveBoundaryAppearance(value, {
  defaults,
  operation
}) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} must be a plain object.`);
  }
  validateKeys(value, ERROR_BAND_BOUNDARY_OPTIONS, operation);
  const stroke = value.stroke ?? defaults.stroke;
  const strokeWidth = value.strokeWidth ?? defaults.strokeWidth;
  const strokeDash = value.strokeDash ?? defaults.strokeDash;
  const opacity = value.opacity ?? defaults.opacity;
  const curve = validateCurveInterpolation(value.curve ?? defaults.curve);
  validateNonEmptyString(stroke, `${operation} stroke`);
  validateNonNegativeFinite(strokeWidth, `${operation} strokeWidth`);
  const resolvedStrokeDash = normalizeStrokeDashPattern(strokeDash);
  validateUnitInterval(opacity, `${operation} opacity`);
  return {
    stroke,
    strokeWidth,
    strokeDash: resolvedStrokeDash,
    opacity,
    curve
  };
}
