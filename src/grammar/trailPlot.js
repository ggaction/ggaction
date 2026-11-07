import { cloneAndFreeze } from "../core/immutable.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite, validateUnitInterval } from "../core/validation.js";
import { validateFillPaint } from "./paint.js";
import { normalizeMarkEffects, MARK_EFFECT_PROPERTIES } from "./markEffects.js";
import { normalizeTrailOptions } from "./trail.js";
import { normalizeTrailWidth, validateTrailMeaning } from "./trailSeries.js";
import { validateCurveInterpolation, validateCardinalTension } from "./curveCommands.js";
import { validateLineMissing } from "./lineMissing.js";
import { normalizeGroupFields } from "./pathSeries.js";

export const TRAIL_PLOT_FIELDS = Object.freeze(["width", "missing", "curve", "tension", "lineJoin", "lineCap", "miterLimit", "fillRule", "closed", "body", "clip"]);
export const TRAIL_PLOT_DEFAULTS = cloneAndFreeze({ body: { fill: "#2563eb", stroke: "none", strokeWidth: 0, opacity: 1 },
  curve: "linear", lineJoin: "miter", lineCap: "butt", miterLimit: 4, fillRule: "nonzero", closed: false, clip: true });
function bodyStyle(value, stored) {
  ownRecord(value, "Trail body");
  rejectUnknownProperties(value, ["fill", "stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES], "Trail body");
  if (Object.values(value).some(value => value == null)) throw new TypeError("Trail body options require defined values.");
  const result = { ...value, ...normalizeMarkEffects(value, "Trail body", stored) };
  if (Object.hasOwn(value, "fill")) result.fill = validateFillPaint(value.fill, "Trail fill");
  if (Object.hasOwn(value, "stroke")) validateNonEmptyString(value.stroke, "Trail stroke");
  if (Object.hasOwn(value, "strokeWidth")) validateNonNegativeFinite(value.strokeWidth, "Trail border width");
  if (Object.hasOwn(value, "opacity")) validateUnitInterval(value.opacity, "Trail opacity");
  return result;
}
export function normalizeTrailPlot(patch, previous, previousConfig, stored = false) {
  ownRecord(patch, "Trail plot"); rejectUnknownProperties(patch, TRAIL_PLOT_FIELDS, "Trail plot");
  if (Object.values(patch).some(value => value == null)) throw new TypeError("Trail options require defined values.");
  const width = Object.hasOwn(patch, "width") ? normalizeTrailWidth(patch.width) : previous?.width;
  const missing = validateLineMissing(patch.missing ?? previous?.missing ?? "error");
  const config = { ...TRAIL_PLOT_DEFAULTS, ...previousConfig };
  for (const key of ["curve", "tension", "lineJoin", "lineCap", "miterLimit", "fillRule", "closed", "clip"]) if (Object.hasOwn(patch, key)) config[key] = patch[key];
  if (patch.curve !== undefined && patch.curve !== "cardinal" && patch.tension === undefined) delete config.tension;
  validateCurveInterpolation(config.curve); validateCardinalTension(config.tension, config.curve);
  normalizeTrailOptions(Object.fromEntries(["lineJoin", "lineCap", "miterLimit", "fillRule", "closed"].map(key => [key, config[key]])));
  if (typeof config.clip !== "boolean") throw new TypeError("Trail clip must be boolean.");
  if (Object.hasOwn(patch, "body")) config.body = { ...config.body, ...bodyStyle(patch.body, stored) };
  const binding = { width, missing }; validateTrailMeaning(binding);
  return cloneAndFreeze({ binding, config });
}
export function validateTrailBinding(layer, config) {
  validateTrailMeaning(layer.trail);
  ownRecord(config, "Trail configuration"); rejectUnknownProperties(config, TRAIL_PLOT_FIELDS.filter(key => !["width", "missing"].includes(key)), "Trail configuration");
  const width = layer.trail.width;
  const normalized = normalizeTrailPlot({ ...config, width: width.field ?? width.datum, missing: layer.trail.missing }, undefined, undefined, true);
  if (canonicalJSON(normalized.binding) !== canonicalJSON(layer.trail) || canonicalJSON(normalized.config) !== canonicalJSON(config)) throw new TypeError("Trail state requires canonical resolved fields.");
  ownRecord(layer.encoding, "Trail encoding"); rejectUnknownProperties(layer.encoding, ["x", "y", "theta", "radius", "group", "pathOrder", "color"], "Trail encoding");
  const polar = layer.encoding.theta !== undefined || layer.encoding.radius !== undefined;
  const positions = polar ? ["theta", "radius"] : ["x", "y"];
  if (polar && (layer.encoding.x !== undefined || layer.encoding.y !== undefined)) throw new TypeError("Trail cannot mix Cartesian and Polar positions.");
  if (polar && config.curve !== "linear") throw new TypeError("Polar Trail requires linear interpolation in projected coordinates.");
  for (const channel of [...positions, ...(layer.encoding.color ? ["color"] : [])]) {
    const value = layer.encoding[channel]; ownRecord(value, `Trail ${channel}`);
    rejectUnknownProperties(value, ["field", "fieldType", "scale", "temporalUnit"], `Trail ${channel}`);
    validateNonEmptyString(value.field, `Trail ${channel} field`); validateNonEmptyString(value.scale, `Trail ${channel} scale`);
    if (!["nominal", "ordinal", "quantitative", "temporal"].includes(value.fieldType)) throw new TypeError(`Trail ${channel} field type is invalid.`);
  }
  if (layer.encoding.group !== undefined) {
    const group = layer.encoding.group; ownRecord(group, "Trail group"); rejectUnknownProperties(group, ["field", "fields", "fieldType"], "Trail group");
    if (group.fieldType !== "nominal" || (group.field === undefined) === (group.fields === undefined)) throw new TypeError("Trail requires one explicit group field binding.");
    normalizeGroupFields(group.fields ?? group.field);
  }
  if (layer.encoding.pathOrder !== undefined) {
    const order = layer.encoding.pathOrder; ownRecord(order, "Trail order"); rejectUnknownProperties(order, ["field", "order"], "Trail order");
    validateNonEmptyString(order.field, "Trail order field");
    if (!["ascending", "descending"].includes(order.order) || polar) throw new TypeError("Trail order requires Cartesian positions and ascending or descending order.");
  }
  if (layer.conditionals !== undefined || layer.source !== undefined) throw new TypeError("Trail requires its explicit source-series meaning.");
}
