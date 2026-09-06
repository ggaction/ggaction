import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { stableDecimal } from "./numeric.js";

const TRANSFORM_KEYS = Object.freeze([
  "type", "field", "groupBy", "weight", "missing", "as", "resolved"
]);
const OUTPUT_KEYS = Object.freeze(["value", "cumulative", "probability"]);

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function normalizeGroupBy(groupBy) {
  const fields = groupBy === undefined
    ? []
    : Array.isArray(groupBy) ? [...groupBy] : [groupBy];
  fields.forEach(field => nonEmptyString(field, "ECDF groupBy field"));
  if (new Set(fields).size !== fields.length) {
    throw new Error("ECDF groupBy fields must be distinct.");
  }
  return fields;
}

function validateOutputs(as, occupied) {
  if (!isPlainObject(as)) throw new TypeError("ECDF as must be a plain object.");
  const keys = Object.keys(as);
  if (keys.length !== OUTPUT_KEYS.length ||
      !OUTPUT_KEYS.every(key => Object.hasOwn(as, key))) {
    throw new Error("ECDF as requires exactly value, cumulative, and probability.");
  }
  const values = OUTPUT_KEYS.map(key => as[key]);
  values.forEach((field, index) => nonEmptyString(field, `ECDF as.${OUTPUT_KEYS[index]}`));
  if (new Set(values).size !== values.length) {
    throw new Error("ECDF output fields must be distinct.");
  }
  if (values.some(field => occupied.has(field))) {
    throw new Error("ECDF output fields must not collide with input or grouping fields.");
  }
}

function validateResolved(resolved, groupBy) {
  if (resolved === undefined) return;
  if (!isPlainObject(resolved) || !Array.isArray(resolved.groups)) {
    throw new TypeError("ECDF resolved provenance must contain a groups array.");
  }
  for (const group of resolved.groups) {
    if (!isPlainObject(group) || !isPlainObject(group.keys) ||
        !Number.isFinite(group.denominator) || group.denominator <= 0 ||
        !Number.isInteger(group.validCount) || group.validCount <= 0 ||
        Object.keys(group.keys).length !== groupBy.length ||
        !groupBy.every(field => Object.hasOwn(group.keys, field))) {
      throw new TypeError("ECDF resolved group provenance is invalid.");
    }
  }
}

export function validateECDFTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("ECDF transform must be a plain object.");
  }
  const unknown = Object.keys(transform).find(key => !TRANSFORM_KEYS.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown ECDF transform property "${unknown}".`);
  }
  if (transform.type !== "ecdf") {
    throw new Error(`Unsupported ECDF transform "${transform.type}".`);
  }
  nonEmptyString(transform.field, "ECDF field");
  const groupBy = normalizeGroupBy(transform.groupBy);
  if (groupBy.includes(transform.field)) {
    throw new Error("ECDF field must not also be a grouping field.");
  }
  if (transform.weight !== undefined) {
    nonEmptyString(transform.weight, "ECDF weight field");
    if (transform.weight === transform.field || groupBy.includes(transform.weight)) {
      throw new Error("ECDF weight field must be distinct from value and grouping fields.");
    }
  }
  if (!["drop", "error"].includes(transform.missing)) {
    throw new Error('ECDF missing must be "drop" or "error".');
  }
  validateOutputs(
    transform.as,
    new Set([transform.field, transform.weight, ...groupBy].filter(Boolean))
  );
  validateResolved(transform.resolved, groupBy);
}

export function normalizeECDFTransform({ field, groupBy, weight, missing = "drop", as }) {
  const transform = {
    type: "ecdf",
    field,
    groupBy: normalizeGroupBy(groupBy),
    ...(weight === undefined ? {} : { weight }),
    missing,
    as
  };
  validateECDFTransform(transform);
  return cloneAndFreeze(transform);
}

function groupValue(value) {
  return typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
}

function rejectOrDrop(transform, index, reason) {
  if (transform.missing === "error") {
    throw new TypeError(`ECDF row ${index} ${reason}.`);
  }
  return false;
}

export function deriveECDF(rows, transform) {
  if (!Array.isArray(rows)) throw new TypeError("ECDF rows must be an array.");
  validateECDFTransform(transform);
  const groups = new Map();

  rows.forEach((row, index) => {
    if (!isPlainObject(row)) {
      rejectOrDrop(transform, index, "must be a plain object");
      return;
    }
    const value = row[transform.field];
    if (!Number.isFinite(value)) {
      rejectOrDrop(transform, index, `has an invalid value in "${transform.field}"`);
      return;
    }
    const keys = transform.groupBy.map(field => row[field]);
    if (!keys.every(groupValue)) {
      rejectOrDrop(transform, index, "has an invalid grouping value");
      return;
    }
    const weight = transform.weight === undefined ? 1 : row[transform.weight];
    if (!Number.isFinite(weight)) {
      rejectOrDrop(transform, index, `has an invalid weight in "${transform.weight}"`);
      return;
    }
    if (weight < 0) {
      throw new RangeError(`ECDF row ${index} has a negative weight.`);
    }
    const key = JSON.stringify(keys);
    if (!groups.has(key)) {
      groups.set(key, {
        keys: Object.fromEntries(transform.groupBy.map((field, offset) => [field, keys[offset]])),
        values: new Map(),
        denominator: 0,
        validCount: 0
      });
    }
    const group = groups.get(key);
    if (weight === 0) return;
    group.values.set(value, (group.values.get(value) ?? 0) + weight);
    group.denominator += weight;
    group.validCount += 1;
  });

  if (groups.size === 0) {
    throw new RangeError("ECDF denominator must be greater than zero.");
  }

  const values = [];
  const provenance = [];
  for (const group of groups.values()) {
    if (!(group.denominator > 0) || !Number.isFinite(group.denominator)) {
      throw new RangeError("ECDF denominator must be finite and greater than zero.");
    }
    const support = [...group.values.keys()].sort((left, right) => left - right);
    values.push({
      ...group.keys,
      [transform.as.value]: support[0],
      [transform.as.cumulative]: 0,
      [transform.as.probability]: 0
    });
    let cumulative = 0;
    for (const value of support) {
      cumulative += group.values.get(value);
      values.push({
        ...group.keys,
        [transform.as.value]: value,
        [transform.as.cumulative]: stableDecimal(cumulative),
        [transform.as.probability]: stableDecimal(cumulative / group.denominator)
      });
    }
    provenance.push({
      keys: group.keys,
      denominator: stableDecimal(group.denominator),
      validCount: group.validCount
    });
  }
  return cloneAndFreeze({ values, resolved: { groups: provenance } });
}

export function resolveECDFTransform(result, transform) {
  return cloneAndFreeze([{ ...transform, resolved: result.resolved }]);
}
