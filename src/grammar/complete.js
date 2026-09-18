import { rejectUnknownProperties as rejectUnknownKeys } from "../core/validation.js";
import { requireStringValue as requireField } from "../core/validation.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const TRANSFORM_KEYS = Object.freeze([
  "type", "key", "groupBy", "values", "sequence", "fill", "members"
]);
const SEQUENCE_KEYS = Object.freeze(["start", "end", "step"]);
const MAX_OUTPUT_ROWS = 10_000;



function scalarType(value, label) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return typeof value;
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  throw new TypeError(`${label} must be a JSON-safe scalar.`);
}

function scalarKey(value, label) {
  const type = scalarType(value, label);
  if (type === "number") return `number:${Object.is(value, -0) ? 0 : value}`;
  if (type === "string") return `string:${value.length}:${value}`;
  return `${type}:${value}`;
}

function normalizeGroupBy(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? [...value] : [value];
}

function validateGroupBy(groupBy, key) {
  if (!Array.isArray(groupBy) || groupBy.some(field =>
    typeof field !== "string" || field.length === 0
  )) {
    throw new TypeError("Complete groupBy must contain field names.");
  }
  if (new Set(groupBy).size !== groupBy.length) {
    throw new Error("Complete groupBy fields must be unique.");
  }
  if (groupBy.includes(key)) {
    throw new Error("Complete key must be distinct from groupBy fields.");
  }
}

function validateValues(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("Complete values must be a non-empty array.");
  }
  let type;
  const seen = new Set();
  values.forEach((value, index) => {
    const current = scalarType(value, `Complete values[${index}]`);
    if (type === undefined) type = current;
    else if (type !== current) {
      throw new TypeError("Complete values must contain one scalar type.");
    }
    const identity = scalarKey(value, `Complete values[${index}]`);
    if (seen.has(identity)) throw new Error("Complete values must be unique.");
    seen.add(identity);
  });
}

function validateSequence(sequence) {
  if (!isPlainObject(sequence)) {
    throw new TypeError("Complete sequence must be a plain object.");
  }
  rejectUnknownKeys(sequence, SEQUENCE_KEYS, "complete sequence");
  if (![sequence.start, sequence.end, sequence.step].every(Number.isFinite)) {
    throw new TypeError("Complete sequence must contain finite start, end, and step values.");
  }
  if (sequence.start > sequence.end) {
    throw new RangeError("Complete sequence start must be at or before end.");
  }
  if (sequence.step <= 0) {
    throw new RangeError("Complete sequence step must be positive.");
  }
}

function validateFill(fill, protectedFields) {
  if (!isPlainObject(fill)) throw new TypeError("Complete fill must be a plain object.");
  for (const [field, value] of Object.entries(fill)) {
    requireField(field, "Complete fill field");
    if (protectedFields.has(field)) {
      throw new Error(`Complete fill cannot replace protected field "${field}".`);
    }
    scalarType(value, `Complete fill field "${field}"`);
  }
}

export function validateCompleteTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Complete transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "complete transform");
  if (transform.type !== "complete") {
    throw new Error(`Unsupported complete transform "${transform.type}".`);
  }
  const key = requireField(transform.key, "Complete key");
  validateGroupBy(transform.groupBy, key);
  const hasValues = Object.hasOwn(transform, "values");
  const hasSequence = Object.hasOwn(transform, "sequence");
  if (hasValues && hasSequence) {
    throw new Error("Complete values and sequence are mutually exclusive.");
  }
  if (hasValues) validateValues(transform.values);
  if (hasSequence) validateSequence(transform.sequence);
  const members = Object.hasOwn(transform, "members")
    ? requireField(transform.members, "Complete members field")
    : undefined;
  validateFill(transform.fill, new Set([key, ...transform.groupBy, members].filter(Boolean)));
  return transform;
}

export function normalizeCompleteTransform(args = {}) {
  const transform = {
    type: "complete",
    key: args.key,
    groupBy: normalizeGroupBy(args.groupBy),
    fill: isPlainObject(args.fill) ? { ...args.fill } : args.fill ?? {}
  };
  if (Object.hasOwn(args, "values")) {
    transform.values = Array.isArray(args.values) ? [...args.values] : args.values;
  }
  if (Object.hasOwn(args, "sequence")) {
    transform.sequence = isPlainObject(args.sequence) ? { ...args.sequence } : args.sequence;
  }
  if (Object.hasOwn(args, "members")) transform.members = args.members;
  validateCompleteTransform(transform);
  return cloneAndFreeze(transform);
}

function define(record, field, value) {
  Object.defineProperty(record, field, {
    value, enumerable: true, writable: true, configurable: true
  });
}

function sequenceDomain(sequence) {
  const domain = [];
  for (let index = 0; index <= MAX_OUTPUT_ROWS; index += 1) {
    const value = sequence.start + index * sequence.step;
    if (!Number.isFinite(value)) {
      throw new RangeError("Complete sequence value is outside the finite numeric range.");
    }
    if (value > sequence.end) return domain;
    domain.push(value === 0 ? 0 : value);
  }
  throw new RangeError(`Complete output cannot exceed ${MAX_OUTPUT_ROWS} rows.`);
}

function observedDomain(rows, key) {
  const domain = [];
  const seen = new Set();
  let type;
  rows.forEach((row, index) => {
    const value = row[key];
    const current = scalarType(value, `Complete key "${key}" at row ${index}`);
    if (type === undefined) type = current;
    else if (type !== current) {
      throw new TypeError(`Complete key "${key}" must contain one scalar type.`);
    }
    const identity = scalarKey(value, `Complete key "${key}" at row ${index}`);
    if (!seen.has(identity)) {
      seen.add(identity);
      domain.push(value);
    }
  });
  return domain;
}

function validateRows(rows, transform) {
  if (!Array.isArray(rows) || !rows.every(isPlainObject)) {
    throw new TypeError("Complete source rows must be plain objects.");
  }
  const required = [transform.key, ...transform.groupBy];
  const groupTypes = new Map();
  const fields = [];
  const fieldSet = new Set();
  rows.forEach((row, index) => {
    Object.keys(row).forEach(field => {
      if (!fieldSet.has(field)) {
        fieldSet.add(field);
        fields.push(field);
      }
    });
    required.forEach(field => {
      if (!Object.hasOwn(row, field)) {
        throw new Error(`Complete source does not contain field "${field}" at row ${index}.`);
      }
      const type = scalarType(row[field], `Complete field "${field}" at row ${index}`);
      const previous = groupTypes.get(field);
      if (previous !== undefined && previous !== type) {
        throw new TypeError(`Complete field "${field}" must contain one scalar type.`);
      }
      groupTypes.set(field, type);
    });
  });
  if (transform.members !== undefined && fieldSet.has(transform.members)) {
    throw new Error(`Complete members field "${transform.members}" already exists.`);
  }
  return fields;
}

function groupRows(rows, transform) {
  if (rows.length === 0) return transform.groupBy.length === 0
    ? [{ values: [], tuple: [] }]
    : [];
  const groups = new Map();
  rows.forEach((row, index) => {
    const tuple = transform.groupBy.map(field => row[field]);
    const identity = tuple.map((value, fieldIndex) =>
      scalarKey(value, `Complete group field "${transform.groupBy[fieldIndex]}"`)
    ).join("\0");
    if (!groups.has(identity)) groups.set(identity, { values: [], tuple });
    groups.get(identity).values.push({ row, index });
  });
  return [...groups.values()];
}

function syntheticRow(fields, group, keyValue, transform) {
  const row = {};
  for (const field of [...fields, ...Object.keys(transform.fill)]) define(row, field, null);
  transform.groupBy.forEach((field, index) => define(row, field, group.tuple[index]));
  define(row, transform.key, keyValue);
  for (const [field, value] of Object.entries(transform.fill)) define(row, field, value);
  if (transform.members !== undefined) define(row, transform.members, []);
  return row;
}

export function deriveCompleteRows(rows, transform) {
  validateCompleteTransform(transform);
  const fields = validateRows(rows, transform);
  const domain = transform.values !== undefined
    ? [...transform.values]
    : transform.sequence !== undefined
      ? sequenceDomain(transform.sequence)
      : observedDomain(rows, transform.key);
  if (domain.length > 0) validateValues(domain);
  const allowed = new Set(domain.map(value => scalarKey(value, "Complete domain value")));
  const groups = groupRows(rows, transform);
  if (groups.length !== 0 && domain.length > Math.floor(MAX_OUTPUT_ROWS / groups.length)) {
    throw new RangeError(`Complete output cannot exceed ${MAX_OUTPUT_ROWS} rows.`);
  }
  const output = [];
  for (const group of groups) {
    const lookup = new Map();
    for (const entry of group.values) {
      const identity = scalarKey(entry.row[transform.key], `Complete key "${transform.key}"`);
      if (!allowed.has(identity)) {
        throw new Error(`Complete observed key is outside the requested domain at row ${entry.index}.`);
      }
      if (lookup.has(identity)) {
        throw new Error("Complete source contains a duplicate group and key combination.");
      }
      lookup.set(identity, entry);
    }
    for (const keyValue of domain) {
      const identity = scalarKey(keyValue, "Complete domain value");
      const entry = lookup.get(identity);
      if (entry === undefined) {
        output.push(syntheticRow(fields, group, keyValue, transform));
      } else {
        const row = { ...entry.row };
        if (transform.members !== undefined) define(row, transform.members, [entry.index]);
        output.push(row);
      }
    }
  }
  return cloneAndFreeze(output);
}
