import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { encodeRowKey, validateTypedRowKeyToken } from "../core/itemIdentity.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite, validatePositiveFinite, validateUnitInterval, validateFontWeight, validateGeneratedItemLimit } from "../core/validation.js";
import { validateFillPaint } from "./paint.js";
import { MARK_EFFECT_PROPERTIES, normalizeMarkEffects } from "./markEffects.js";
import { validateTextFormat } from "./text.js";
import { normalizeSortTransform } from "./sort.js";
import { normalizeSummaryTransform } from "./summary.js";
import { validateCurveInterpolation, validateCardinalTension } from "./curveCommands.js";
import { validateLineMissing } from "./lineMissing.js";

export const TABLE_PLOT_FIELDS = Object.freeze(["columns", "sortBy", "rowLimit", "rowHeight", "padding", "header", "cells", "labels", "headerStyle", "footerStyle", "bars", "sparklines", "clip"]);
export const TABLE_PLOT_DEFAULTS = cloneAndFreeze({
  cells: { fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1, opacity: 1 },
  labels: { fill: "#0f172a", fontFamily: "sans-serif", fontSize: 12, fontWeight: "normal" },
  headerStyle: { fill: "#f1f5f9", color: "#0f172a", fontWeight: "bold" },
  footerStyle: { fill: "#f1f5f9", color: "#0f172a", fontWeight: "bold" },
  bars: { fill: "#93c5fd", stroke: "none", strokeWidth: 0, opacity: 1 },
  sparklines: { stroke: "#2563eb", strokeWidth: 1.5, opacity: 1 }
});
const BODY = ["fill", "stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES];
const TEXT = ["fill", "fontFamily", "fontSize", "fontWeight", ...MARK_EFFECT_PROPERTIES];
const BAND = ["fill", "color", "fontWeight"];
const LINE = ["stroke", "strokeWidth", "opacity", ...MARK_EFFECT_PROPERTIES];
const COLUMN_FIELDS = ["key", "field", "label", "format", "missingText", "footer", "cell", "width", "align", "wrap"];

function record(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (Object.values(value).some(entry => entry == null)) throw new TypeError(`${label} cannot contain null or undefined.`);
  return value;
}
function domain(value, label) {
  ownArray(value, label);
  if (value.length !== 2 || !value.every(Number.isFinite) || value[0] > value[1]) throw new RangeError(`${label} requires two finite ascending values.`);
  return [...value];
}
function style(value, fields, label, stored) {
  record(value, fields, label);
  const output = { ...value, ...normalizeMarkEffects(value, label, stored) };
  for (const [key, entry] of Object.entries(value)) {
    if (["fill", "color"].includes(key)) output[key] = validateFillPaint(entry, `${label} ${key}`);
    else if (["stroke", "fontFamily"].includes(key)) validateNonEmptyString(entry, `${label} ${key}`);
    else if (key === "strokeWidth") validateNonNegativeFinite(entry, `${label} strokeWidth`);
    else if (key === "opacity") validateUnitInterval(entry, `${label} opacity`);
    else if (key === "fontSize") validatePositiveFinite(entry, `${label} fontSize`);
    else if (key === "fontWeight") validateFontWeight(entry, `${label} fontWeight`);
  }
  return output;
}
function content(input = "text") {
  const value = typeof input === "string" ? { type: input } : input;
  ownRecord(value, "Table cell");
  if (value.type === "text") return record(value, ["type"], "Table text cell");
  if (value.type === "bar") {
    record(value, ["type", "domain"], "Table bar cell");
    const result = { type: "bar" };
    if (value.domain !== undefined) {
      result.domain = domain(value.domain, "Table bar domain");
      if (result.domain[0] > 0 || result.domain[1] < 0) throw new RangeError("Table bar domain must include zero.");
    }
    return result;
  }
  if (value.type !== "sparkline") throw new TypeError("Table cell type must be text, bar, or sparkline.");
  record(value, ["type", "x", "y", "xType", "temporalUnit", "xDomain", "yDomain", "resolveY", "curve", "tension", "missing"], "Table sparkline cell");
  const result = { type: "sparkline", x: value.x, y: value.y, xType: "quantitative", resolveY: "shared", curve: "linear", missing: "error", ...value };
  validateNonEmptyString(result.x, "Table sparkline x field"); validateNonEmptyString(result.y, "Table sparkline y field");
  if (!["quantitative", "temporal"].includes(result.xType)) throw new TypeError("Table sparkline xType must be quantitative or temporal.");
  if (result.temporalUnit !== undefined && (result.xType !== "temporal" || !["year", "timestamp"].includes(result.temporalUnit))) throw new TypeError("Table sparkline temporalUnit requires temporal xType and year or timestamp.");
  if (!["shared", "independent"].includes(result.resolveY)) throw new TypeError("Table sparkline resolveY must be shared or independent.");
  for (const key of ["xDomain", "yDomain"]) if (result[key] !== undefined) result[key] = domain(result[key], `Table sparkline ${key}`);
  if (result.yDomain !== undefined && result.resolveY === "independent") throw new TypeError("An explicit Table yDomain requires shared resolution.");
  validateCurveInterpolation(result.curve); validateCardinalTension(result.tension, result.curve); validateLineMissing(result.missing);
  return result;
}
function footer(input, field, format) {
  if (input === undefined || input === false) return false;
  const value = typeof input === "string" ? { op: input } : input;
  record(value, ["op", "missing", "empty", "format"], "Table footer");
  if (typeof value.op !== "string") throw new TypeError("Table footer requires a scalar aggregate name.");
  const output = { missing: "drop", empty: "null", format, ...value };
  validateTextFormat(output.format);
  normalizeSummaryTransform({ aggregates: [{ op: output.op, ...(output.op === "count" ? {} : { field }), as: "value" }], missing: output.missing, empty: output.empty });
  return output;
}
function columns(input, stored) {
  ownArray(input, "Table columns"); validateGeneratedItemLimit(input.length, "Table column count");
  if (input.length === 0) throw new RangeError("Table requires at least one column.");
  const keys = new Set(), meanings = [], styles = [];
  for (const entry of input) {
    const value = typeof entry === "string" ? { field: entry } : record(entry, COLUMN_FIELDS, "Table column");
    validateNonEmptyString(value.field, "Table column field");
    const key = stored ? validateTypedRowKeyToken(value.key) : encodeRowKey(value.key ?? value.field);
    validateNonEmptyString(key, "Table column key");
    if (keys.has(key)) throw new TypeError("Table column keys must be unique.");
    keys.add(key);
    const label = value.label ?? value.field, format = value.format ?? "auto", missingText = value.missingText ?? "—";
    if (typeof label !== "string" || typeof missingText !== "string") throw new TypeError("Table labels and missingText must be strings.");
    validateTextFormat(format);
    const cell = content(value.cell), aggregate = footer(value.footer, value.field, format);
    if (cell.type === "sparkline" && aggregate !== false && aggregate.op !== "count") throw new TypeError("A sparkline column footer supports row count only.");
    meanings.push({ key, field: value.field, label, format, missingText, cell, footer: aggregate });
    const width = value.width ?? "auto", align = value.align ?? "left", wrap = value.wrap ?? "word";
    if (width !== "auto") validatePositiveFinite(width, "Table column width");
    if (!["left", "center", "right"].includes(align)) throw new TypeError("Table column align must be left, center, or right.");
    if (![false, "word", "character"].includes(wrap)) throw new TypeError("Table column wrap must be false, word, or character.");
    styles.push({ key, width, align, wrap });
  }
  return { meanings, styles };
}

export function normalizeTablePlot(patch, previous, previousConfig, stored = false) {
  record(patch, TABLE_PLOT_FIELDS, "Table plot");
  const normalized = patch.columns === undefined ? undefined : columns(patch.columns, stored);
  const binding = { columns: normalized?.meanings ?? previous?.columns, sortBy: previous?.sortBy ?? [] };
  if (binding.columns === undefined) throw new TypeError("Table requires columns.");
  if (Object.hasOwn(patch, "sortBy")) {
    if (patch.sortBy !== false) {
      ownArray(patch.sortBy, "Table sortBy");
      for (const key of patch.sortBy) record(key, ["field", "order", "nulls", "temporalUnit"], "Table sort key");
    }
    binding.sortBy = patch.sortBy === false ? [] : normalizeSortTransform({ sortBy: patch.sortBy }).sortBy;
  }
  const config = { rowHeight: 28, padding: 4, header: true, clip: true, ...TABLE_PLOT_DEFAULTS, ...previousConfig,
    columns: normalized?.styles ?? previousConfig?.columns };
  for (const key of ["rowHeight", "padding", "header", "clip", "rowLimit"]) if (Object.hasOwn(patch, key)) config[key] = patch[key];
  if (config.rowLimit === false) delete config.rowLimit;
  if (config.rowLimit !== undefined && (!Number.isSafeInteger(config.rowLimit) || config.rowLimit < 0)) throw new RangeError("Table rowLimit must be a nonnegative safe integer or false.");
  validatePositiveFinite(config.rowHeight, "Table rowHeight"); validateNonNegativeFinite(config.padding, "Table padding");
  if (2 * config.padding >= config.rowHeight) throw new RangeError("Table padding must leave positive cell height.");
  for (const key of ["header", "clip"]) if (typeof config[key] !== "boolean") throw new TypeError(`Table ${key} must be boolean.`);
  for (const [key, fields] of [["cells", BODY], ["labels", TEXT], ["headerStyle", BAND], ["footerStyle", BAND], ["bars", BODY], ["sparklines", LINE]]) {
    if (Object.hasOwn(patch, key)) config[key] = { ...config[key], ...style(patch[key], fields, `Table ${key}`, stored) };
  }
  return cloneAndFreeze({ binding, config });
}

export function validateTableBinding(layer, config) {
  record(layer.table, ["columns", "sortBy"], "Table binding");
  ownArray(layer.table.sortBy, "Table stored sortBy");
  record(config, ["columns", "rowHeight", "padding", "header", "clip", "rowLimit", ...Object.keys(TABLE_PLOT_DEFAULTS)], "Table configuration");
  ownArray(config.columns, "Table column configuration"); ownArray(layer.table.columns, "Table columns");
  if (config.columns.length !== layer.table.columns.length) throw new TypeError("Table column meanings and appearances must agree.");
  const joined = layer.table.columns.map((column, index) => {
    record(column, ["key", "field", "label", "format", "missingText", "cell", "footer"], "Table column meaning");
    const appearance = record(config.columns[index], ["key", "width", "align", "wrap"], "Table column appearance");
    if (appearance.key !== column.key) throw new TypeError("Table column meaning and appearance keys must agree.");
    return { ...column, ...appearance };
  });
  const normalized = normalizeTablePlot({ ...config, columns: joined, sortBy: layer.table.sortBy.length ? layer.table.sortBy : false }, undefined, undefined, true);
  const equal = (a, b) => Array.isArray(a) !== Array.isArray(b) ? false : a !== null && b !== null && typeof a === "object" && typeof b === "object"
    ? Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && equal(a[key], b[key])) : Object.is(a, b);
  if (!equal(normalized.binding, layer.table) || !equal(normalized.config, config)) throw new TypeError("Table state requires canonical resolved fields.");
  if (layer.source !== undefined || layer.conditionals !== undefined) throw new TypeError("Table cells require their own dataset layout.");
  record(layer.encoding ?? {}, ["color"], "Table encoding");
}
