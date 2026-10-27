import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { normalizeTemporalValue } from "./scales/fields.js";

const ORDERS = new Set(["ascending", "descending"]);
const NULLS = new Set(["first", "last"]);
const TEMPORAL_UNITS = new Set(["year", "timestamp"]);

export function normalizeSortTransform({ sortBy }) {
  if (!Array.isArray(sortBy) || sortBy.length === 0 ||
      Array.from({ length: sortBy.length }, (_, index) => index).some(index => !Object.hasOwn(sortBy, index))) {
    throw new TypeError("Sorted data sortBy must be a non-empty dense array.");
  }
  const keys = sortBy.map((key, index) => {
    if (!isPlainObject(key)) throw new TypeError(`Sort key ${index} must be a plain object.`);
    const unknown = Object.keys(key).find(name => !["field", "order", "nulls", "temporalUnit"].includes(name));
    if (unknown !== undefined) throw new Error(`Unknown sort key property "${unknown}".`);
    if (typeof key.field !== "string" || key.field.length === 0) {
      throw new TypeError(`Sort key ${index} field must be a non-empty string.`);
    }
    const order = key.order ?? "ascending";
    const nulls = key.nulls ?? "last";
    if (!ORDERS.has(order)) throw new Error(`Unsupported sort order "${order}".`);
    if (!NULLS.has(nulls)) throw new Error(`Unsupported sort null placement "${nulls}".`);
    if (key.temporalUnit !== undefined && !TEMPORAL_UNITS.has(key.temporalUnit)) {
      throw new Error(`Unsupported sort temporalUnit "${key.temporalUnit}".`);
    }
    return { field: key.field, order, nulls, ...(key.temporalUnit === undefined ? {} : { temporalUnit: key.temporalUnit }) };
  });
  if (new Set(keys.map(key => key.field)).size !== keys.length) {
    throw new Error("Sorted data sortBy fields must be unique.");
  }
  return cloneAndFreeze({ type: "sort", sortBy: keys });
}

export function validateSortTransform(transform) {
  if (!isPlainObject(transform)) throw new TypeError("Sort transform must be a plain object.");
  const unknown = Object.keys(transform).find(key => !["type", "sortBy"].includes(key));
  if (unknown !== undefined) throw new Error(`Unknown sort transform property "${unknown}".`);
  if (transform.type !== "sort") throw new Error('Sort transform type must be "sort".');
  normalizeSortTransform(transform);
}

function compareValues(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function normalizedKey(value, key, rowIndex) {
  if (value === null || value === undefined) return { missing: true };
  if (key.temporalUnit !== undefined) {
    return { missing: false, value: normalizeTemporalValue(value, key.field, rowIndex, key.temporalUnit) };
  }
  if (!["number", "string", "boolean"].includes(typeof value) ||
      (typeof value === "number" && !Number.isFinite(value))) {
    throw new TypeError(`Sort field "${key.field}" requires finite number, string, boolean, or missing values at row ${rowIndex}.`);
  }
  return { missing: false, value, type: typeof value };
}

export function deriveSortedRows(values, transform) {
  if (!Array.isArray(values)) throw new TypeError("Sort source values must be an array.");
  validateSortTransform(transform);
  const decorated = values.map((row, index) => ({
    row,
    index,
    keys: transform.sortBy.map(key => normalizedKey(row[key.field], key, index))
  }));
  for (let keyIndex = 0; keyIndex < transform.sortBy.length; keyIndex += 1) {
    const key = transform.sortBy[keyIndex];
    const types = new Set(decorated.map(entry => entry.keys[keyIndex]).filter(value => !value.missing).map(value => value.type ?? "number"));
    if (types.size > 1) throw new TypeError(`Sort field "${key.field}" contains mixed non-missing types.`);
  }
  decorated.sort((left, right) => {
    for (let index = 0; index < transform.sortBy.length; index += 1) {
      const key = transform.sortBy[index];
      const a = left.keys[index];
      const b = right.keys[index];
      if (a.missing || b.missing) {
        if (a.missing !== b.missing) return a.missing === (key.nulls === "first") ? -1 : 1;
        continue;
      }
      const compared = compareValues(a.value, b.value);
      if (compared !== 0) return key.order === "ascending" ? compared : -compared;
    }
    return left.index - right.index;
  });
  return decorated.map(entry => entry.row);
}
