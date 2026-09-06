import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const TRANSFORM_KEYS = Object.freeze(["type", "fields", "as"]);
const AS_KEYS = Object.freeze(["key", "value"]);
const MAX_FIELDS = 64;
const MAX_OUTPUT_ROWS = 10_000;

function rejectUnknownKeys(value, supported, label) {
  const unknown = Object.keys(value).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown ${label} property "${unknown}".`);
  }
}

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function normalizeAs(value) {
  const requested = value ?? {};
  if (!isPlainObject(requested)) return requested;
  return {
    ...requested,
    key: requested.key ?? "key",
    value: requested.value ?? "value"
  };
}

export function normalizeFoldTransform({ fields, as } = {}) {
  const transform = {
    type: "fold",
    fields: Array.isArray(fields) ? [...fields] : fields,
    as: normalizeAs(as)
  };
  validateFoldTransform(transform);
  return cloneAndFreeze(transform);
}

export function validateFoldTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Fold transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "fold transform");
  if (transform.type !== "fold") {
    throw new Error(`Unsupported fold transform "${transform.type}".`);
  }
  if (!Array.isArray(transform.fields) || transform.fields.length === 0) {
    throw new TypeError("Fold fields must be a non-empty array.");
  }
  if (transform.fields.length > MAX_FIELDS) {
    throw new RangeError(`Fold fields cannot contain more than ${MAX_FIELDS} entries.`);
  }
  transform.fields.forEach((field, index) => {
    requireField(field, `Fold fields[${index}]`);
  });
  if (new Set(transform.fields).size !== transform.fields.length) {
    throw new Error("Fold fields must be unique.");
  }
  if (!isPlainObject(transform.as)) {
    throw new TypeError("Fold as must be a plain object.");
  }
  rejectUnknownKeys(transform.as, AS_KEYS, "fold as");
  const key = requireField(transform.as.key, "Fold as.key");
  const value = requireField(transform.as.value, "Fold as.value");
  if (key === value) {
    throw new Error("Fold output fields must be unique.");
  }
  return transform;
}

function valueType(value, field, row) {
  if (value === null || value === undefined) {
    throw new TypeError(`Fold field "${field}" is missing at row ${row}.`);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Fold field "${field}" must contain finite numbers.`);
    }
    return "number";
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return typeof value;
  }
  throw new TypeError(
    `Fold field "${field}" must contain finite numbers, strings, or booleans.`
  );
}

export function deriveFoldRows(rows, transform) {
  validateFoldTransform(transform);
  if (rows.length * transform.fields.length > MAX_OUTPUT_ROWS) {
    throw new RangeError(`Fold output cannot exceed ${MAX_OUTPUT_ROWS} rows.`);
  }
  const sourceFields = new Set(rows.flatMap(row => Object.keys(row)));
  for (const output of [transform.as.key, transform.as.value]) {
    if (sourceFields.has(output)) {
      throw new Error(`Fold output field "${output}" already exists.`);
    }
  }
  let expectedType;
  const output = [];
  rows.forEach((row, rowIndex) => {
    for (const field of transform.fields) {
      if (!Object.hasOwn(row, field)) {
        throw new Error(`Fold source does not contain field "${field}" at row ${rowIndex}.`);
      }
      const type = valueType(row[field], field, rowIndex);
      if (expectedType === undefined) expectedType = type;
      else if (type !== expectedType) {
        throw new TypeError("Fold fields must contain one common primitive type.");
      }
      output.push({
        ...row,
        [transform.as.key]: field,
        [transform.as.value]: row[field]
      });
    }
  });
  return output;
}
