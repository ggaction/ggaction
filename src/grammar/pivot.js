import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import {
  rejectUnknownProperties,
  requireStringValue,
  validateGeneratedItemLimit,
  validateWorkLimit
} from "../core/validation.js";
import { aggregateScalarValues } from "./aggregate.js";
import { scalarKey } from "./transformKeys.js";

const KEYS = ["type", "field", "value", "groupBy", "columns", "op", "fill"];
const OPERATIONS = new Set(["none", "sum", "mean", "min", "max", "count"]);
const MAX_COLUMNS = 64;

function boundedArray(value, label, maximum) {
  if (Array.isArray(value)) validateGeneratedItemLimit(value.length, label, maximum);
  return ownArray(value, label);
}

function numericValue(value, label) {
  if (value !== null && !Number.isFinite(value)) {
    throw new TypeError(`${label} must be null or a finite number.`);
  }
  return value;
}

function requiredCell(row, field, index) {
  if (!Object.hasOwn(row, field)) {
    throw new Error(`Pivot source does not contain field "${field}" at row ${index}.`);
  }
  return row[field];
}

function sourceRows(rows, workPerRow) {
  // Check length before creating the descriptor table for a large or sparse array.
  if (Array.isArray(rows)) validateWorkLimit(rows.length * workPerRow, "Pivot input work");
  return ownArray(rows, "Pivot source rows");
}

function inferColumns(rows, field) {
  sourceRows(rows, 2);
  const columns = new Map();
  rows.forEach((row, index) => {
    ownRecord(row, `Pivot row ${index}`);
    const value = requiredCell(row, field, index);
    if (typeof value !== "string" || value.length === 0) {
      throw new Error("Pivot requires explicit columns for non-string or empty keys.");
    }
    if (!columns.has(value)) {
      validateGeneratedItemLimit(columns.size + 1, "Pivot columns", MAX_COLUMNS);
      columns.set(value, { value, as: value });
    }
  });
  if (columns.size === 0) throw new Error("Pivot requires explicit columns for empty input.");
  return [...columns.values()];
}

export function normalizePivotTransform(options = {}, rows) {
  ownRecord(options, "Pivot options");
  rejectUnknownProperties(options, KEYS, "pivot options");
  if (options.type !== undefined && options.type !== "pivot") {
    throw new Error("Pivot transform type must be pivot.");
  }
  const field = requireStringValue(options.field, "Pivot field");
  const transform = {
    type: "pivot",
    field,
    groupBy: options.groupBy === undefined ? []
      : typeof options.groupBy === "string" ? [options.groupBy] : options.groupBy,
    columns: options.columns === undefined ? inferColumns(rows, field) : options.columns,
    op: options.op === undefined ? "none" : options.op,
    fill: options.fill === undefined ? null : options.fill,
    ...(Object.hasOwn(options, "value") ? { value: options.value } : {})
  };
  validatePivotTransform(transform);
  return cloneAndFreeze(transform);
}

export function validatePivotTransform(transform) {
  ownRecord(transform, "Pivot transform");
  rejectUnknownProperties(transform, KEYS, "pivot transform");
  if (transform.type !== "pivot") throw new Error("Pivot transform type must be pivot.");
  requireStringValue(transform.field, "Pivot field");
  if (Array.isArray(transform.groupBy)) validateWorkLimit(transform.groupBy.length, "Pivot grouping work");
  ownArray(transform.groupBy, "Pivot groupBy");
  const names = new Set();
  for (const field of transform.groupBy) {
    requireStringValue(field, "Pivot group field");
    if (names.has(field)) throw new Error("Pivot group fields must be unique.");
    names.add(field);
  }
  boundedArray(transform.columns, "Pivot columns", MAX_COLUMNS);
  if (transform.columns.length === 0) throw new Error("Pivot columns must not be empty.");
  const keys = new Set();
  for (const column of transform.columns) {
    ownRecord(column, "Pivot column");
    rejectUnknownProperties(column, ["value", "as"], "pivot column");
    const key = scalarKey(column.value, "Pivot column value");
    if (keys.has(key)) throw new Error("Pivot column values must be unique.");
    keys.add(key);
    requireStringValue(column.as, "Pivot column as");
    if (names.has(column.as)) throw new Error(`Pivot output field "${column.as}" collides with another output.`);
    names.add(column.as);
  }
  if (!OPERATIONS.has(transform.op)) throw new Error("Unsupported pivot operation.");
  if (transform.op === "count") {
    if (Object.hasOwn(transform, "value")) throw new Error("Pivot count does not accept a value field.");
  } else requireStringValue(transform.value, "Pivot value field");
  numericValue(transform.fill, "Pivot fill");
  return transform;
}

export function derivePivotRows(rows, transform) {
  validatePivotTransform(transform);
  // Include input validation, grouping and aggregate scans before allocating cells.
  const inputWork = sourceRows(rows, transform.groupBy.length + 5).length * (transform.groupBy.length + 5);
  const columns = new Map(transform.columns.map((column, index) => [scalarKey(column.value, "Pivot column value"), index]));
  const groups = new Map();
  rows.forEach((row, index) => {
    ownRecord(row, `Pivot row ${index}`);
    const column = columns.get(scalarKey(requiredCell(row, transform.field, index), "Pivot source key"));
    if (column === undefined) throw new Error(`Pivot source key is outside the declared columns at row ${index}.`);
    const tuple = transform.groupBy.map(field => requiredCell(row, field, index));
    const key = JSON.stringify(tuple.map(value => scalarKey(value, "Pivot group value")));
    const value = transform.op === "count" ? null
      : numericValue(requiredCell(row, transform.value, index), `Pivot value at row ${index}`);
    if (!groups.has(key)) {
      validateGeneratedItemLimit(groups.size + 1, "Pivot output row count");
      validateWorkLimit(inputWork + (groups.size + 1) * (transform.groupBy.length + transform.columns.length), "Pivot output work");
      groups.set(key, { tuple, cells: new Map() });
    }
    const cells = groups.get(key).cells;
    if (!cells.has(column)) cells.set(column, []);
    cells.get(column).push(value);
  });
  const output = [];
  for (const { tuple, cells } of groups.values()) {
    const fields = transform.groupBy.map((field, index) => [field, tuple[index]]);
    transform.columns.forEach((column, index) => {
      const values = cells.get(index);
      let value = transform.fill;
      if (values !== undefined) {
        if (transform.op === "none") {
          if (values.length !== 1) throw new Error("Pivot duplicate cells require an aggregation operation.");
          value = values[0];
        } else {
          value = aggregateScalarValues(values, transform.op);
          if (value === undefined) value = transform.op === "sum" ? 0 : null;
        }
      }
      fields.push([column.as, value]);
    });
    output.push(Object.fromEntries(fields));
  }
  return cloneAndFreeze(output);
}
