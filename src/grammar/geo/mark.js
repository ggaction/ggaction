import { validateGeoEncodings } from "./encoding.js";
import { validateGeoAnnotationBinding } from "./annotation.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { validateInputReference } from "../../core/resourceReference.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite, validateUnitInterval } from "../../core/validation.js";
import { isBlendMode } from "../compositing.js";
import { validateFillPaint } from "../paint.js";
import { MARK_EFFECT_PROPERTIES, normalizeMarkEffects } from "../markEffects.js";
import { resolveStrokeDetails, STROKE_STYLE_PROPERTIES } from "../strokeStyle.js";
import { projectionTuple } from "./projectionOptions.js";

export const GEO_MODES = Object.freeze(["shape", "point", "line", "graticule", "annotation"]);
export function isGeoLabelSource(layer) {
  return layer?.mark?.type === "geo" && ["shape", "point", "line", "graticule"].includes(layer.geoBinding?.mode);
}

const REQUIRED_STYLE = ["fill", "stroke", "strokeWidth", "opacity", "radiusPx", "clip", ...STROKE_STYLE_PROPERTIES];
export const GEO_STYLE_FIELDS = Object.freeze([...REQUIRED_STYLE, "blend", ...MARK_EFFECT_PROPERTIES]);

export function normalizeGeoStyle(mode, patch = {}, previous, stored = false) {
  if (!GEO_MODES.includes(mode)) throw new TypeError("Unknown geographic mark mode.");
  ownRecord(patch, "Geographic mark style"); rejectUnknownProperties(patch, GEO_STYLE_FIELDS, "geographic mark style");
  const linear = mode === "line" || mode === "graticule";
  if (linear && Object.hasOwn(patch, "fill") && patch.fill !== "none") throw new TypeError("Geographic lines require fill none.");
  if (linear && Object.hasOwn(patch, "radiusPx") && !stored) throw new TypeError("Point radius requires a shape or point mark.");
  const result = { fill: linear ? "none" : "#2563eb", stroke: mode === "point" ? "none" : "#1f2937", strokeWidth: mode === "point" ? 0 : 1,
    opacity: 1, radiusPx: 3, clip: false, ...previous, ...patch, ...normalizeMarkEffects(patch, "Geographic mark style", stored) };
  result.fill = validateFillPaint(result.fill, "Geographic fill");
  validateNonEmptyString(result.stroke, "Geographic stroke"); validateNonNegativeFinite(result.strokeWidth, "Geographic strokeWidth");
  validateNonNegativeFinite(result.radiusPx, "Geographic radiusPx"); validateUnitInterval(result.opacity, "Geographic opacity");
  if (typeof result.clip !== "boolean") throw new TypeError("Geographic clip must be boolean.");
  if (Object.hasOwn(result, "blend") && !isBlendMode(result.blend)) throw new TypeError("Geographic blend must be normal, multiply, screen, or difference.");
  return cloneAndFreeze({ ...result, ...resolveStrokeDetails(result) });
}

export function normalizeGraticule(input = {}) {
  ownRecord(input, "Graticule request"); rejectUnknownProperties(input, ["stepDeg", "extentDeg", "precisionDeg"], "graticule");
  const stepDeg = projectionTuple(input.stepDeg ?? [10, 10], [2], "Graticule stepDeg");
  if (stepDeg.some(value => value <= 0 || value > 180)) throw new RangeError("Graticule steps must be greater than zero and at most 180 degrees.");
  const extent = input.extentDeg ?? [[-180, -80], [180, 80]];
  if (!Array.isArray(extent) || extent.length !== 2) throw new TypeError("Graticule extent requires two geographic corners.");
  const extentDeg = extent.map(value => projectionTuple(value, [2], "Graticule extentDeg"));
  if (extentDeg.some(value => Math.abs(value[0]) > 180 || Math.abs(value[1]) > 90) ||
      extentDeg[0].some((value, index) => value >= extentDeg[1][index])) throw new RangeError("Graticule extent must be ordered within longitude and latitude bounds.");
  const precisionDeg = input.precisionDeg ?? 2.5;
  if (!Number.isFinite(precisionDeg) || precisionDeg <= 0 || precisionDeg > 10) throw new RangeError("Graticule precisionDeg must be greater than zero and at most 10.");
  return cloneAndFreeze({ stepDeg, extentDeg, precisionDeg });
}

export function validateGeoMarkBinding(layer, config) {
  const binding = layer.geoBinding;
  if (binding?.mode === "annotation") return validateGeoAnnotationBinding(layer, config);
  ownRecord(binding, "Geographic mark binding");
  if (!GEO_MODES.includes(binding.mode)) throw new TypeError("Unknown geographic mark mode.");
  const graticule = binding.mode === "graticule";
  rejectUnknownProperties(binding, graticule ? ["mode", "graticule"] : ["mode", "geometry", "interpolation", "routeHint", "radiusDeg"], "geographic mark binding");
  if (graticule) {
    ownRecord(binding.graticule, "Stored graticule");
    if (["stepDeg", "extentDeg", "precisionDeg"].some(key => !Object.hasOwn(binding.graticule, key))) throw new TypeError("Stored graticule requires all resolved fields.");
    normalizeGraticule(binding.graticule);
  }
  else {
    validateInputReference(binding.geometry);
    if (binding.geometry.kind !== "geometry") throw new TypeError("Geographic marks require geometry references.");
    if (!["source-segment", "great-circle"].includes(binding.interpolation)) throw new TypeError("Unknown geographic line interpolation.");
    if (Object.hasOwn(binding, "routeHint")) {
      const hint = projectionTuple(binding.routeHint, [2], "Geographic routeHint");
      if (binding.interpolation !== "great-circle" || Math.abs(hint[1]) > 90) throw new TypeError("routeHint requires a geographic great-circle point.");
    }
    if (Object.hasOwn(binding, "radiusDeg") && (binding.mode !== "point" || !Number.isFinite(binding.radiusDeg) || binding.radiusDeg <= 0 || binding.radiusDeg >= 180)) throw new RangeError("Geographic point radiusDeg must be greater than zero and less than 180.");
  }
  ownRecord(config, "Stored geographic mark style");
  if (REQUIRED_STYLE.some(key => !Object.hasOwn(config, key))) throw new TypeError("Geographic style requires all resolved fields.");
  normalizeGeoStyle(binding.mode, config, undefined, true);
  validateGeoEncodings(layer);
  if (layer.data !== undefined) throw new TypeError("Geographic marks require their geometry resource and native field mappings.");
}
