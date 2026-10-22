import { validateNonEmptyString } from "../core/validation.js";
import { normalizeTemporalValue } from "./scales/fields.js";
import { pathGroupFields, pathSeriesKey } from "./pathSeries.js";
import { stableOrderPathValues } from "./pathOrder.js";

export function validateLineMissing(value = "error") {
  if (!["error", "break"].includes(value)) {
    throw new Error('Line missing must be "error" or "break".');
  }
  return value;
}

export function validateLineMissingScope(layer) {
  if (validateLineMissing(layer.mark?.missing) !== "break") return;
  const encoding = layer.encoding ?? {};
  if (encoding.parallel !== undefined || encoding.theta !== undefined ||
      encoding.radius !== undefined || [encoding.x, encoding.y].some(position =>
        position !== undefined && (position.aggregate !== undefined ||
          position.bin !== undefined || !["quantitative", "temporal"].includes(position.fieldType)))) {
    throw new Error("Line missing:break requires direct Cartesian quantitative/temporal positions.");
  }
}

// Keep positional nulls as topology boundaries, not scale values or coerced zeros.
export function readLinePosition(rows, encoding) {
  const { field, fieldType, temporalUnit } = encoding;
  validateNonEmptyString(field, "Line position field");
  if (!["quantitative", "temporal"].includes(fieldType)) {
    throw new Error("Line missing:break requires quantitative/temporal positions.");
  }
  if (!rows.some(row => Object.hasOwn(row, field))) {
    throw new Error(`Line position field "${field}" does not exist.`);
  }
  const values = rows.map((row, index) => {
    const value = row[field];
    if (value == null) return null;
    if (fieldType === "temporal") return normalizeTemporalValue(value, field, index, temporalUnit);
    if (!Number.isFinite(value)) {
      throw new TypeError(`Field "${field}" must contain a finite number at row ${index}.`);
    }
    return value;
  });
  if (!values.some(value => value !== null)) {
    throw new Error(`Line position field "${field}" requires at least one nonmissing value.`);
  }
  return values;
}

// An unknown order coordinate has no sortable position: preserve it as a boundary.
export function orderLineGapValues(values, orderValues, direction = "ascending") {
  const result = [], run = [];
  const flush = () => {
    const ordered = stableOrderPathValues(run.map(item => item.value),
      run.map(item => item.order), direction);
    for (const value of ordered) result.push(value);
    run.length = 0;
  };
  values.forEach((value, index) => {
    if (orderValues[index] === null) {
      flush(); result.push(value);
    } else run.push({ value, order: orderValues[index] });
  });
  flush();
  return result;
}

export function splitLineGapValues(values) {
  const segments = [], run = [];
  const flush = () => { if (run.length) segments.push(run.splice(0)); };
  for (const value of values) {
    if (value.x === null || value.y === null) flush();
    else run.push(value);
  }
  flush();
  return segments;
}

// Filtering painted runs must not delete the invisible separators and bridge them.
export function retainLineGapBoundaries(rows, members, layer) {
  if (layer?.mark?.type !== "line" || layer.mark.missing !== "break") return members;
  const fields = pathGroupFields(layer);
  const key = row => pathSeriesKey(fields.map(field => row[field]));
  const selectedSeries = new Set([...members].map(key));
  const result = new Set(members);
  for (const row of rows) {
    if ((row[layer.encoding.x.field] == null || row[layer.encoding.y.field] == null) &&
        selectedSeries.has(key(row))) result.add(row);
  }
  return result;
}
