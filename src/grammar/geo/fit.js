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
  return cloneAndFreeze({ parameters, bounds: projectGeometry(geometry, parameters, streamOptions).bounds });
}
