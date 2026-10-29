import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite, validatePositiveFinite, validateUnitInterval, validateFontWeight } from "../../core/validation.js";
import { validateFillPaint } from "../paint.js";
import { MARK_EFFECT_PROPERTIES, normalizeMarkEffects } from "../markEffects.js";

const BODY = ["fill", "stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES];
const TEXT = ["fill", "fontFamily", "fontSize", "fontWeight", ...MARK_EFFECT_PROPERTIES];
export const CALENDAR_LABEL_ROLES = Object.freeze(["month", "weekday", "week", "year"]);
export const CALENDAR_PLOT_FIELDS = Object.freeze(["cells", "monthBoundary", "labels", "clip"]);
export const CALENDAR_PLOT_DEFAULTS = cloneAndFreeze({
  cells: { fill: "#2563eb", emptyFill: "#f1f5f9", stroke: "none", strokeWidth: 0, opacity: 1, gap: .08 },
  monthBoundary: { stroke: "#64748b", strokeWidth: 1, opacity: 1 },
  labels: { fill: "#0f172a", fontFamily: "sans-serif", fontSize: 10, fontWeight: "normal" }
});
function paint(input, fields, label, stored) {
  ownRecord(input, label); rejectUnknownProperties(input, fields, label);
  if (Object.values(input).some(value => value === undefined)) throw new TypeError(`${label} cannot contain undefined.`);
  const result = { ...input, ...normalizeMarkEffects(input, label, stored) };
  for (const [key, value] of Object.entries(input)) {
    if (key === "fill" || key === "emptyFill") result[key] = validateFillPaint(value, `${label} ${key}`);
    else if (key === "stroke" || key === "fontFamily") validateNonEmptyString(value, `${label} ${key}`);
    else if (key === "strokeWidth") validateNonNegativeFinite(value, `${label} strokeWidth`);
    else if (key === "opacity") validateUnitInterval(value, `${label} opacity`);
    else if (key === "fontSize") validatePositiveFinite(value, `${label} fontSize`);
    else if (key === "fontWeight") validateFontWeight(value, `${label} fontWeight`);
    else if (key === "gap" && (!Number.isFinite(value) || value < 0 || value >= 1)) throw new TypeError("Calendar cell gap must be from zero up to one, excluding one.");
  }
  return result;
}
function required(value, fields, label) {
  ownRecord(value, label);
  if (fields.some(field => !Object.hasOwn(value, field))) throw new TypeError(`${label} requires all resolved fields.`);
}
export function normalizeCalendarPlot(patch = {}, previous, previousLabels) {
  ownRecord(patch, "Calendar plot"); rejectUnknownProperties(patch, CALENDAR_PLOT_FIELDS, "calendar plot");
  if (Object.values(patch).some(value => value === undefined)) throw new TypeError("Calendar plot options cannot be undefined.");
  const config = { clip: true, cells: CALENDAR_PLOT_DEFAULTS.cells, monthBoundary: CALENDAR_PLOT_DEFAULTS.monthBoundary,
    labels: Object.fromEntries(CALENDAR_LABEL_ROLES.map(role => [role, CALENDAR_PLOT_DEFAULTS.labels])), ...previous };
  const labels = { ...Object.fromEntries(CALENDAR_LABEL_ROLES.map(role => [role, true])), ...previousLabels };
  if (Object.hasOwn(patch, "clip")) config.clip = patch.clip;
  if (typeof config.clip !== "boolean") throw new TypeError("Calendar clip must be boolean.");
  if (Object.hasOwn(patch, "cells")) config.cells = { ...config.cells, ...paint(patch.cells, [...BODY, "emptyFill", "gap"], "Calendar cells") };
  if (Object.hasOwn(patch, "monthBoundary")) config.monthBoundary = patch.monthBoundary === false ? false
    : { ...CALENDAR_PLOT_DEFAULTS.monthBoundary, ...(config.monthBoundary || {}), ...paint(patch.monthBoundary, BODY.filter(field => field !== "fill"), "Calendar month boundary") };
  if (Object.hasOwn(patch, "labels")) {
    const options = patch.labels === false ? Object.fromEntries(CALENDAR_LABEL_ROLES.map(role => [role, false])) : patch.labels;
    ownRecord(options, "Calendar labels"); rejectUnknownProperties(options, CALENDAR_LABEL_ROLES, "calendar labels");
    config.labels = { ...config.labels };
    for (const [role, value] of Object.entries(options)) {
      labels[role] = value !== false;
      if (value === false) delete config.labels[role];
      else config.labels[role] = { ...CALENDAR_PLOT_DEFAULTS.labels, ...config.labels[role], ...paint(value, TEXT, `Calendar ${role} label`) };
    }
  }
  return cloneAndFreeze({ config, labels });
}
export function validateCalendarBinding(layer, config) {
  ownRecord(layer.calendarBinding, "Calendar binding"); rejectUnknownProperties(layer.calendarBinding, ["layout"], "calendar binding");
  if (layer.calendarBinding.layout?.kind !== "layout") throw new TypeError("Calendar binding requires a layout reference.");
  required(config, ["clip", "cells", "monthBoundary", "labels"], "Calendar plot configuration");
  rejectUnknownProperties(config, ["clip", "cells", "monthBoundary", "labels"], "calendar plot configuration");
  if (typeof config.clip !== "boolean") throw new TypeError("Calendar clip must be boolean.");
  required(config.cells, ["fill", "emptyFill", "stroke", "strokeWidth", "opacity", "gap"], "Calendar cells");
  paint(config.cells, [...BODY, "emptyFill", "gap"], "Calendar cells", true);
  if (config.monthBoundary !== false) {
    required(config.monthBoundary, ["stroke", "strokeWidth", "opacity"], "Calendar month boundary");
    paint(config.monthBoundary, BODY.filter(field => field !== "fill"), "Calendar month boundary", true);
  }
  required(layer.calendarLabels, CALENDAR_LABEL_ROLES, "Calendar label meaning"); rejectUnknownProperties(layer.calendarLabels, CALENDAR_LABEL_ROLES, "calendar label meaning");
  ownRecord(config.labels, "Calendar label paint"); rejectUnknownProperties(config.labels, CALENDAR_LABEL_ROLES, "calendar label paint");
  for (const role of CALENDAR_LABEL_ROLES) {
    if (typeof layer.calendarLabels[role] !== "boolean" || layer.calendarLabels[role] !== Object.hasOwn(config.labels, role)) throw new TypeError("Calendar label meaning and paint disagree.");
    if (layer.calendarLabels[role]) {
      required(config.labels[role], ["fill", "fontFamily", "fontSize", "fontWeight"], "Calendar label");
      paint(config.labels[role], TEXT, "Calendar label", true);
    }
  }
  if (layer.encoding !== undefined) { ownRecord(layer.encoding, "Calendar encoding"); rejectUnknownProperties(layer.encoding, ["color"], "calendar encoding"); }
  if (layer.encoding?.color !== undefined) {
    const color = layer.encoding.color; required(color, ["field", "fieldType", "scale"], "Calendar color");
    rejectUnknownProperties(color, ["field", "fieldType", "scale"], "calendar color");
    if (color.field !== "value" || color.fieldType !== "quantitative" || typeof color.scale !== "string" || !color.scale) throw new TypeError("Calendar color requires its intrinsic quantitative value.");
  }
  if (layer.data !== undefined || layer.conditionals !== undefined) throw new TypeError("Calendar marks use their layout rather than row encodings.");
}
