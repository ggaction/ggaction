import { ownRecord } from "../../core/ownData.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { finiteProjectionNumber, projectionTuple } from "./projectionOptions.js";

export function fitProjectedBounds(bounds, input) {
  ownRecord(input, "Projection fit options");
  rejectUnknownProperties(input, ["width", "height", "padding", "pointScale", "scalePx"], "projection fit");
  const [x0, y0, x1, y1] = projectionTuple(bounds, [4], "Projected bounds");
  if (x1 < x0 || y1 < y0) throw new RangeError("Projection fit requires nonempty ordered bounds.");
  const width = finiteProjectionNumber(input.width, "Fit width"), height = finiteProjectionNumber(input.height, "Fit height");
  const padding = finiteProjectionNumber(Object.hasOwn(input, "padding") ? input.padding : 0, "Fit padding");
  if (padding < 0 || width <= padding * 2 || height <= padding * 2) throw new RangeError("Projection fit requires positive inner dimensions.");
  for (const key of ["pointScale", "scalePx"]) if (Object.hasOwn(input, key) && finiteProjectionNumber(input[key], key) <= 0) throw new RangeError(`${key} must be positive.`);
  const dx = x1 - x0, dy = y1 - y0;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new RangeError("Projection fit bounds overflow.");
  const scalePx = dx || dy ? Math.min(dx ? (width - padding * 2) / dx : Infinity, dy ? (height - padding * 2) / dy : Infinity) : input.pointScale ?? input.scalePx;
  if (!(scalePx > 0) || !Number.isFinite(scalePx)) throw new RangeError("Point-only fit requires a finite positive pointScale or current scalePx.");
  const translatePx = [width / 2 - scalePx * (x0 / 2 + x1 / 2), height / 2 - scalePx * (y0 / 2 + y1 / 2)];
  if (!translatePx.every(Number.isFinite)) throw new RangeError("Projection fit translation overflows.");
  return cloneAndFreeze({ scalePx, translatePx });
}
