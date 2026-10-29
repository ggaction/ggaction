import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite, validateUnitInterval } from "../../core/validation.js";
import { validateFillPaint } from "../paint.js";
import { MARK_EFFECT_PROPERTIES, normalizeMarkEffects } from "../markEffects.js";

const REQUIRED_STYLE_FIELDS = Object.freeze(["fill", "stroke", "strokeWidth", "opacity", "clip"]);
export const CONTOUR_STYLE_FIELDS = Object.freeze([...REQUIRED_STYLE_FIELDS, ...MARK_EFFECT_PROPERTIES]);

export function normalizeContourStyle(mode, patch = {}, previous, stored = false) {
  if (!["line", "filled"].includes(mode)) throw new TypeError("Contour mode must be line or filled.");
  ownRecord(patch, "Contour style"); rejectUnknownProperties(patch, CONTOUR_STYLE_FIELDS, "contour style");
  const result = { fill: "#2563eb", stroke: "#1f2937", strokeWidth: 1, opacity: 1, clip: true, ...previous, ...patch,
    ...normalizeMarkEffects(patch, "Contour style", stored) };
  result.fill = validateFillPaint(result.fill, "Contour fill");
  validateNonEmptyString(result.stroke, "Contour stroke");
  validateNonNegativeFinite(result.strokeWidth, "Contour strokeWidth");
  validateUnitInterval(result.opacity, "Contour opacity");
  if (typeof result.clip !== "boolean") throw new TypeError("Contour clip must be boolean.");
  if (mode === "line" && Object.hasOwn(patch, "fill") && patch.fill !== "none") throw new TypeError("Line contours require fill none.");
  if (mode === "line") result.fill = "none";
  return cloneAndFreeze(result);
}

export function validateContourBinding(layer, config) {
  const binding = layer.contourBinding;
  ownRecord(binding, "Contour binding"); rejectUnknownProperties(binding, ["geometry", "mode"], "contour binding");
  if (binding.geometry?.kind !== "geometry" || !["line", "filled"].includes(binding.mode)) throw new TypeError("Contour binding requires geometry and a supported mode.");
  ownRecord(config, "Stored contour style");
  if (REQUIRED_STYLE_FIELDS.some(key => !Object.hasOwn(config, key))) throw new TypeError("Stored contour style requires all resolved fields.");
  normalizeContourStyle(binding.mode, config, undefined, true);
  ownRecord(layer.encoding, "Contour encodings"); rejectUnknownProperties(layer.encoding, ["x", "y", "color"], "contour encodings");
  for (const channel of ["x", "y", ...(layer.encoding.color === undefined ? [] : ["color"])]) {
    const value = layer.encoding[channel]; ownRecord(value, "Contour encoding");
    rejectUnknownProperties(value, ["field", "fieldType", "scale"], "contour encoding");
    if (value.field !== (channel === "color" ? "value" : channel) || value.fieldType !== "quantitative" || typeof value.scale !== "string" || !value.scale) throw new TypeError("Contour encodings require their intrinsic quantitative fields.");
  }
  if (layer.data !== undefined || layer.conditionals !== undefined) throw new TypeError("Contour marks use their geometry resource rather than row encodings.");
}
