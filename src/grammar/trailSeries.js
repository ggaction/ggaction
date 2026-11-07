import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString, validateNonNegativeFinite } from "../core/validation.js";
import { deriveLineSeries } from "./lineSeries.js";
import { validateLineMissing } from "./lineMissing.js";
import { pathGroupFields, pathSeriesKey } from "./pathSeries.js";

export function normalizeTrailWidth(value) {
  if (typeof value === "string") { validateNonEmptyString(value, "Trail width field"); return cloneAndFreeze({ field: value }); }
  validateNonNegativeFinite(value, "Trail width");
  return cloneAndFreeze({ datum: value });
}
export function validateTrailMeaning(value) {
  ownRecord(value, "Trail meaning"); rejectUnknownProperties(value, ["width", "missing"], "Trail meaning");
  ownRecord(value.width, "Trail width"); rejectUnknownProperties(value.width, ["field", "datum"], "Trail width");
  if (Object.keys(value.width).length !== 1) throw new TypeError("Trail width requires exactly one field or datum.");
  if (Object.hasOwn(value.width, "field")) validateNonEmptyString(value.width.field, "Trail width field");
  else validateNonNegativeFinite(value.width.datum, "Trail width");
  validateLineMissing(value.missing);
}
// This is a read-only view for the existing direct line series owner. Neither
// the view nor the temporary missing-width column enters semantic state.
export function trailLineView(rows, layer) {
  if (layer.mark?.type !== "trail") throw new TypeError("Trail series requires a semantic Trail mark.");
  validateTrailMeaning(layer.trail);
  const { width, missing } = layer.trail, polar = layer.encoding?.theta !== undefined || layer.encoding?.radius !== undefined;
  const encoding = { ...layer.encoding };
  if (polar) {
    if (encoding.x !== undefined || encoding.y !== undefined) throw new TypeError("Trail cannot mix Cartesian and Polar positions.");
    if (encoding.pathOrder !== undefined) throw new TypeError("Polar Trail follows the shared theta order and does not support pathOrder.");
    encoding.x = encoding.theta; encoding.y = encoding.radius; delete encoding.theta; delete encoding.radius;
    if (encoding.y?.fieldType !== "quantitative") throw new TypeError("Polar Trail requires quantitative radius.");
  }
  if (encoding.x === undefined || encoding.y === undefined) throw new TypeError("Trail requires both position encodings.");
  if ([encoding.x, encoding.y].some(position => position.aggregate !== undefined || position.bin !== undefined || position.datum !== undefined)) {
    throw new TypeError("Trail requires direct position fields; compute transformed values in an explicit dataset.");
  }
  if (width.field !== undefined && !rows.some(row => Object.hasOwn(row, width.field))) throw new TypeError(`Trail width field "${width.field}" does not exist.`);
  const widths = rows.map((row, index) => {
    const value = width.field === undefined ? width.datum : row[width.field];
    if (missing === "break" && value == null) return null;
    validateNonNegativeFinite(value, `Trail width at row ${index}`); return value;
  });
  let values = rows;
  if (widths.some(value => value === null)) {
    const fields = new Set(rows.flatMap(row => Object.keys(row))); let temporary = "\0trail-width-gap";
    while (fields.has(temporary)) temporary += "\0";
    const original = encoding.y;
    values = rows.map((row, index) => ({ ...row, [temporary]: widths[index] === null ? null : row[original.field] }));
    encoding.y = { ...original, field: temporary };
  }
  return { rows: values, widths, polar, layer: { ...layer, mark: { type: "line", missing }, encoding } };
}
export function deriveTrailSeries(rows, layer, options = {}) {
  const view = trailLineView(rows, layer);
  const result = deriveLineSeries(view.rows, view.layer, { ...options, lineage: true, vertexLineage: true,
    ...(view.polar ? { xDomain: options.thetaDomain } : {}) });
  const fields = pathGroupFields(view.layer), counts = new Map();
  for (const row of rows) {
    const key = pathSeriesKey(fields.map(field => row[field])); counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const xs = new Set(result.series.flatMap(series => series.values.map(value => value.x)));
  const ys = new Set(result.series.flatMap(series => series.values.map(value => value.y)));
  return cloneAndFreeze({ ...result, xValues: result.xValues.filter(value => xs.has(value)), yValues: result.yValues.filter(value => ys.has(value)), polar: view.polar, series: result.series.map(series => ({ ...series,
    hasGaps: series.sourceIndices.length < counts.get(pathSeriesKey(fields.map(field => series.key[field]))),
    values: series.values.map((value, index) => ({ ...value, width: view.widths[series.vertexSourceIndices[index][0]] })) })) });
}
