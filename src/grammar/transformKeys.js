import { isPlainObject } from "../core/immutable.js";
import { requireStringValue, rejectUnknownProperties } from "../core/validation.js";

export function scalarKey(value, label) {
  if (value === null) return "null";
  if (typeof value === "string") return `string:${value.length}:${value}`;
  if (typeof value === "boolean") return `boolean:${value}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `number:${Object.is(value, -0) ? 0 : value}`;
  }
  throw new TypeError(
    `${label} must contain null, strings, booleans, or finite numbers.`
  );
}

export function normalizeSortBy(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return value;
  return value.map(sort => isPlainObject(sort)
    ? { ...sort, order: sort.order ?? "ascending" }
    : sort
  );
}

export function validateSortBy(sortBy, label) {
  const kind = label.toLowerCase();
  if (!Array.isArray(sortBy)) throw new TypeError(`${label} sortBy must be an array.`);
  const fields = [];
  sortBy.forEach((sort, index) => {
    if (!isPlainObject(sort)) {
      throw new TypeError(`${label} sortBy[${index}] must be a plain object.`);
    }
    rejectUnknownProperties(sort, ["field", "order"], `${kind} sortBy[${index}]`);
    fields.push(requireStringValue(sort.field, `${label} sortBy[${index}].field`));
    if (!["ascending", "descending"].includes(sort.order)) {
      throw new Error(`Unsupported ${kind} sort order "${sort.order}".`);
    }
  });
  if (new Set(fields).size !== fields.length) {
    throw new Error(`${label} sortBy fields must be unique.`);
  }
}

export function isGroupValue(value) {
  return typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
}
