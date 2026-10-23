import { rejectUnknownProperties, requireStringValue } from "../core/validation.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const KEYS = Object.freeze(["type", "fields", "as"]);
const MAX_FIELDS = 64;
const MAX_OUTPUT_ROWS = 10_000;

export function normalizeFlattenTransform({ fields, as } = {}) {
  const aliases = as === undefined ? fields : as;
  const transform = {
    type: "flatten",
    fields: Array.isArray(fields) ? [...fields] : fields,
    as: Array.isArray(aliases) ? [...aliases] : aliases
  };
  validateFlattenTransform(transform);
  return cloneAndFreeze(transform);
}

export function validateFlattenTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Flatten transform must be a plain object.");
  }
  rejectUnknownProperties(transform, KEYS, "flatten transform");
  if (transform.type !== "flatten") {
    throw new Error(`Unsupported flatten transform "${transform.type}".`);
  }
  if (!Array.isArray(transform.fields) || transform.fields.length === 0) {
    throw new TypeError("Flatten fields must be a non-empty array.");
  }
  if (transform.fields.length > MAX_FIELDS) {
    throw new RangeError(`Flatten fields cannot contain more than ${MAX_FIELDS} entries.`);
  }
  if (!Array.isArray(transform.as) || transform.as.length !== transform.fields.length) {
    throw new TypeError("Flatten as must be an array with one alias per field.");
  }
  for (const key of ["fields", "as"]) {
    for (const [index, field] of transform[key].entries()) {
      requireStringValue(field, `Flatten ${key}[${index}]`);
    }
    if (new Set(transform[key]).size !== transform[key].length) {
      throw new Error(`Flatten ${key} must be unique.`);
    }
  }
  return transform;
}

export function deriveFlattenRows(rows, transform) {
  validateFlattenTransform(transform);
  const selected = new Set(transform.fields);
  const existing = new Set(rows.flatMap(row => Object.keys(row)));
  for (const name of transform.as) {
    if (existing.has(name) && !selected.has(name)) {
      throw new Error(`Flatten output field "${name}" already exists outside the selected fields.`);
    }
  }
  let total = 0;
  const lengths = rows.map((row, rowIndex) => {
    let length = 0;
    for (const field of transform.fields) {
      const value = row[field];
      if (value === undefined || value === null) continue;
      if (!Array.isArray(value)) {
        throw new TypeError(`Flatten field "${field}" must be an array at row ${rowIndex}.`);
      }
      length = Math.max(length, value.length);
    }
    total += length;
    if (total > MAX_OUTPUT_ROWS) {
      throw new RangeError(`Flatten output cannot exceed ${MAX_OUTPUT_ROWS} rows.`);
    }
    return length;
  });
  const output = [];
  rows.forEach((row, rowIndex) => {
    for (let index = 0; index < lengths[rowIndex]; index += 1) {
      const next = { ...row };
      transform.fields.forEach((field, fieldIndex) => {
        const values = row[field];
        next[transform.as[fieldIndex]] = values?.[index] ?? null;
      });
      output.push(next);
    }
  });
  return output;
}
