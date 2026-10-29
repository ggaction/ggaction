import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { normalizeProjectionOptions } from "./projectionOptions.js";
import { fitProjectedBounds } from "./projectionFit.js";
import { projectGeometry } from "./stream.js";

export function fitGeometryProjection(geometry, input, viewport, streamOptions) {
  ownRecord(viewport, "Geometry fit viewport");
  rejectUnknownProperties(viewport, ["width", "height", "padding", "pointScale"], "geometry fit");
  const options = normalizeProjectionOptions(input);
  const { scalePx, translatePx, clipExtentPx, ...shape } = options;
  const unit = { ...shape, scalePx: 1, translatePx: [0, 0], ...(options.precisionPx === undefined ? {} : { precisionPx: options.precisionPx / options.scalePx }) };
  const projected = projectGeometry(geometry, unit, streamOptions);
  if (projected.bounds === null) throw new RangeError("Cannot fit empty or wholly clipped geometry.");
  const fit = fitProjectedBounds(projected.bounds, { ...viewport, scalePx });
  let parameters = normalizeProjectionOptions({ ...options, ...fit });
  // Refine once at final pixel precision so scale-dependent subdivision bounds fit too.
  const { clipExtentPx: ignored, ...unclipped } = parameters;
  const screen = projectGeometry(geometry, unclipped, streamOptions);
  if (screen.bounds === null) throw new RangeError("Cannot fit empty projected geometry.");
  const correction = fitProjectedBounds(screen.bounds, { ...viewport, scalePx: 1, ...(viewport.pointScale === undefined ? {} : { pointScale: 1 }) });
  parameters = normalizeProjectionOptions({ ...parameters, scalePx: parameters.scalePx * correction.scalePx,
    translatePx: parameters.translatePx.map((value, index) => value * correction.scalePx + correction.translatePx[index]) });
  const { clipExtentPx: finalClip, ...finalUnclipped } = parameters;
  const final = projectGeometry(geometry, finalUnclipped, streamOptions);
  const expected = screen.bounds.map((value, index) => value * correction.scalePx + correction.translatePx[index % 2]);
  const pointOnly = screen.bounds[0] === screen.bounds[2] && screen.bounds[1] === screen.bounds[3];
  const tolerance = pointOnly ? 1e-7 : Math.max(1e-7, parameters.precisionPx ?? 0) * 2;
  if (final.bounds === null || final.bounds.some((value, index) => Math.abs(value - expected[index]) > tolerance)) {
    throw new RangeError("Projection fit cannot preserve viewport precision.");
  }
  return cloneAndFreeze({ parameters, bounds: finalClip == null ? final.bounds : projectGeometry(geometry, parameters, streamOptions).bounds });
}
