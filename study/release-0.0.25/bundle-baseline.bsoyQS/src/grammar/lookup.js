import {cloneAndFreeze, isPlainObject} from "../core/immutable.js";
import {validateUserId} from "../core/identifiers.js";
import {
  rejectUnknownProperties, requireStringValue, validateDataRows, validateWorkLimit
} from "../core/validation.js";

export function normalizeLookupTransform({field, lookup} = {}) {
  if (!isPlainObject(lookup)) throw new TypeError("Lookup requires a lookup object.");
  const definition = {
    type: "lookup", field,
    lookup: {
      ...lookup,
      fields: Array.isArray(lookup.fields) ? [...lookup.fields] : lookup.fields,
      as: Array.isArray(lookup.as === undefined ? lookup.fields : lookup.as) ? [...(lookup.as === undefined ? lookup.fields : lookup.as)] : lookup.as
    }
  };
  validateLookupTransform(definition);
  return cloneAndFreeze(definition);
}

export function validateLookupTransform(transform) {
  if (!isPlainObject(transform)) throw new TypeError("Lookup transform must be a plain object.");
  rejectUnknownProperties(transform, ["type", "field", "lookup"], "lookup transform");
  if (transform.type !== "lookup") throw new Error(`Unsupported lookup transform "${transform.type}".`);
  requireStringValue(transform.field, "Lookup field");
  const lookup = transform.lookup;
  if (!isPlainObject(lookup)) throw new TypeError("Lookup requires a lookup object.");
  rejectUnknownProperties(lookup, ["data", "key", "fields", "as"], "lookup definition");
  validateUserId(lookup.data, "Lookup dataset id");
  requireStringValue(lookup.key, "Lookup key");
  if (!Array.isArray(lookup.fields) || lookup.fields.length === 0) {
    throw new TypeError("Lookup fields must be a non-empty array.");
  }
  if (!Array.isArray(lookup.as) || lookup.as.length !== lookup.fields.length) {
    throw new TypeError("Lookup as requires one alias per field.");
  }
  for (const key of ["fields", "as"]) {
    for (let i = 0; i < lookup[key].length; i += 1) {
      if (!Object.hasOwn(lookup[key], i)) throw new TypeError(`Lookup ${key} must be dense.`);
      requireStringValue(lookup[key][i], `Lookup ${key}[${i}]`);
    }
    if (new Set(lookup[key]).size !== lookup[key].length) {
      throw new Error(`Lookup ${key} must be unique.`);
    }
  }
  return transform;
}

function keyValue(row, field) {
  const key = Object.hasOwn(row, field) ? row[field] : undefined;
  if (key === undefined || key === null) return undefined;
  if (typeof key !== "string" && typeof key !== "boolean" && !Number.isFinite(key)) {
    throw new TypeError(`Lookup key field "${field}" requires a string, finite number or boolean.`);
  }
  return key;
}

export function deriveLookupRows(rows, lookupRows, transform) {
  validateLookupTransform(transform);
  validateDataRows(rows, "Lookup primary data");
  validateDataRows(lookupRows, "Lookup reference data");
  const lookup = transform.lookup;
  validateWorkLimit(lookupRows.length + rows.length * (lookup.fields.length + 1), "Lookup work");
  const existing = new Set(rows.flatMap(row => Object.keys(row)));
  for (const name of lookup.as) {
    if (existing.has(name)) throw new Error(`Lookup output field "${name}" already exists in primary data.`);
  }
  const index = new Map();
  for (const row of lookupRows) {
    const key = keyValue(row, lookup.key);
    if (key === undefined) continue;
    if (index.has(key)) throw new Error(`Lookup key field "${lookup.key}" contains duplicate keys.`);
    index.set(key, row);
  }
  return cloneAndFreeze(rows.map(row => {
    const key = keyValue(row, transform.field);
    const match = key === undefined ? undefined : index.get(key);
    const output = {...row};
    for (let i = 0; i < lookup.fields.length; i += 1) {
      const field = lookup.fields[i];
      Object.defineProperty(output, lookup.as[i], {
        value: match !== undefined && Object.hasOwn(match, field) ? match[field] ?? null : null,
        enumerable: true, configurable: true, writable: true
      });
    }
    return output;
  }));
}

export function sameLookupValue(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left), other = Object.keys(right);
  return keys.length === other.length && keys.every((key, index) =>
    key === other[index] && sameLookupValue(left[key], right[key]));
}
