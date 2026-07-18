import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../core/validation.js";
import { DEFAULT_COLORS } from "../theme/defaults.js";

export const DEFAULT_RECT_MARK = Object.freeze({
  fill: DEFAULT_COLORS.mark,
  opacity: 1,
  stroke: "white",
  strokeWidth: 1
});

export function normalizeRectMarkConfig(patch, previous = DEFAULT_RECT_MARK) {
  const result = { ...previous };
  if (Object.hasOwn(patch, "fill")) {
    result.fill = validateNonEmptyString(patch.fill, "Rect fill");
  }
  if (Object.hasOwn(patch, "opacity")) {
    result.opacity = validateUnitInterval(patch.opacity, "Rect opacity");
  }
  if (Object.hasOwn(patch, "stroke")) {
    result.stroke = patch.stroke === false
      ? false
      : validateNonEmptyString(patch.stroke, "Rect stroke");
  }
  if (Object.hasOwn(patch, "strokeWidth")) {
    if (result.stroke === false) {
      throw new Error("Rect strokeWidth requires an active stroke.");
    }
    result.strokeWidth = validateNonNegativeFinite(
      patch.strokeWidth,
      "Rect strokeWidth"
    );
  }
  return Object.freeze(result);
}
