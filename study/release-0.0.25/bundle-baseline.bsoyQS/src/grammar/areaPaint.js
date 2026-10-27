import { isLinearGradientPaint, validateFillPaint } from "./paint.js";

// Area fill shares the concrete paint grammar; outlines remain solid colors.
export function validateAreaPaintConfig(config) {
  if (config.fill !== undefined) validateFillPaint(config.fill, "Area fill");
  if (config.strokeFromFill === true && isLinearGradientPaint(config.fill)) {
    throw new Error("Area stroke-from-fill requires a solid fill; specify a solid stroke for a gradient area.");
  }
  return config;
}
