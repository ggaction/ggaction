import {
  isLinearGradientPaint,
  validateFillPaint
} from "../../grammar/paint.js";
import { resolveCanvasGradientCoordinates } from "./native.js";

export function applyCanvasFill(context, fill, bounds, graphicId) {
  validateFillPaint(fill, `${graphicId}.fill`);
  if (!isLinearGradientPaint(fill)) {
    context.fillStyle = fill;
    return fill;
  }
  if (typeof context.createLinearGradient !== "function") {
    throw new TypeError(
      `Graphic "${graphicId}" requires Canvas context createLinearGradient().`
    );
  }
  const coordinates = resolveCanvasGradientCoordinates(fill, bounds, graphicId);
  const gradient = context.createLinearGradient(
    coordinates.from.x,
    coordinates.from.y,
    coordinates.to.x,
    coordinates.to.y
  );
  if (gradient === null || typeof gradient !== "object" || typeof gradient.addColorStop !== "function") {
    throw new TypeError(
      `Graphic "${graphicId}" requires a Canvas linear gradient with addColorStop().`
    );
  }
  for (const stop of fill.stops) gradient.addColorStop(stop.offset, stop.color);
  context.fillStyle = gradient;
  return gradient;
}
