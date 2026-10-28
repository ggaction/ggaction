import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, requireStringValue, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";

export function graphFields(value, label, { empty = false } = {}) {
  ownArray(value, label);
  if ((!empty && value.length === 0) || value.length > 64) throw new RangeError(`${label} requires ${empty ? "zero" : "one"} to 64 fields.`);
  value.forEach(field => requireStringValue(field, label));
  if (new Set(value).size !== value.length) throw new TypeError(`${label} requires unique fields.`);
  return [...value];
}

export function graphKeyField(value, label) {
  return Array.isArray(value) ? graphFields(value, label) : requireStringValue(value, label);
}

export function graphSourceRows(values, maximum, label) {
  if (Array.isArray(values)) {
    validateGeneratedItemLimit(values.length, label, maximum);
    validateWorkLimit(values.length * 64, "Graph source work");
  }
  ownArray(values, label);
  let work = 0;
  for (const row of values) {
    ownRecord(row, label);
    validateWorkLimit(work += Reflect.ownKeys(row).length * 8, "Graph source fields");
  }
  return values;
}

export function graphFieldValue(row, field, required = false) {
  if (!Object.hasOwn(row, field)) {
    if (required) throw new TypeError(`Graph source requires its own ${field} field.`);
    return undefined;
  }
  return row[field];
}

export function graphSourceKey(row, fields) {
  return Array.isArray(fields) ? fields.map(field => graphFieldValue(row, field, true)) : graphFieldValue(row, fields, true);
}

export function graphAttributes(row, fields) {
  return Object.fromEntries(fields.map(field => [field, graphFieldValue(row, field, true)]));
}

export function graphFeatureFields(features, metric) {
  if (Array.isArray(features)) return graphFields(features, "Graph features");
  ownRecord(features, "Graph features");
  const keys = metric === "jaccard" ? ["set"] : metric === "great-circle" ? ["longitude", "latitude"] : [];
  if (!keys.length) throw new TypeError("Numeric graph features require a field array.");
  rejectUnknownProperties(features, keys, "graph features");
  for (const key of keys) requireStringValue(features[key], `Graph ${key} field`);
  return Object.fromEntries(keys.map(key => [key, features[key]]));
}

export function graphFeatureVector(row, fields) {
  if (Array.isArray(fields)) return fields.map(field => graphFieldValue(row, field));
  if (Object.hasOwn(fields, "set")) {
    const values = graphFieldValue(row, fields.set);
    if (values === undefined || values === null) return [values];
    if (Array.isArray(values)) validateWorkLimit(values.length * 8, "Graph set work");
    ownArray(values, "Graph set field");
    return values;
  }
  return [graphFieldValue(row, fields.longitude), graphFieldValue(row, fields.latitude)];
}
