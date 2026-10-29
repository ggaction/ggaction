import { ownRecord } from "../../core/ownData.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { normalizeProjectionOptions } from "./projectionOptions.js";
import { fitProjectedBounds } from "./projectionFit.js";

// Authored fit policy and its resolved scale/translation have separate owners.
export function normalizeProjectionDefinition(input) {
  ownRecord(input, "Projection definition");
  const { fit, ...math } = input;
  const parameters = normalizeProjectionOptions(math);
  if (!Object.hasOwn(input, "fit")) return parameters;
  if (Object.hasOwn(math, "scalePx") || Object.hasOwn(math, "translatePx")) throw new TypeError("Projection fit conflicts with explicit scalePx or translatePx.");
  ownRecord(fit, "Projection fit");
  rejectUnknownProperties(fit, ["width", "height", "padding", "pointScale"], "projection fit");
  const resolved = { width: fit.width, height: fit.height, padding: 0, pointScale: parameters.scalePx, ...fit };
  fitProjectedBounds([0, 0, 0, 0], resolved);
  const { scalePx, translatePx, ...shape } = parameters;
  return cloneAndFreeze({ ...shape, fit: resolved });
}

export function projectionParameters(resource) {
  const { fit, ...parameters } = resource.options;
  return fit === undefined ? parameters : { ...parameters, scalePx: resource.result.scalePx, translatePx: resource.result.translatePx };
}
