import { IMPUTE_REQUIRED_OPTIONS } from "../core/optionRequirements.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { interpolateNumber, inverseLerp } from "./numeric.js";
import { normalizeTemporalValue } from "./scales/fields.js";

const TRANSFORM_KEYS = Object.freeze([
  "type", "fields", "groupBy", "sortBy", "method", "value", "edges", "maxGap"
]);
const SORT_KEYS = Object.freeze(["field", "order"]);
const METHODS = Object.freeze(Object.keys(IMPUTE_REQUIRED_OPTIONS));

function rejectUnknownKeys(value, supported, label) {
  const unknown = Object.keys(value).find(key => !supported.includes(key));
  if (unknown !== undefined) throw new Error(`Unknown ${label} property "${unknown}".`);
}

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function validateFieldList(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some(field =>
    typeof field !== "string" || field.length === 0
  )) {
    throw new TypeError(`${label} must be a non-empty field array.`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} fields must be unique.`);
}

function normalizeFieldList(value, { allowEmpty = false } = {}) {
  if (value === undefined) return allowEmpty ? [] : value;
  return Array.isArray(value) ? [...value] : [value];
}

function normalizeSortBy(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return value;
  return value.map(sort => isPlainObject(sort)
    ? { ...sort, order: sort.order ?? "ascending" }
    : sort
  );
}

function validateSortBy(sortBy) {
  if (!Array.isArray(sortBy)) throw new TypeError("Impute sortBy must be an array.");
  const fields = [];
  sortBy.forEach((sort, index) => {
    if (!isPlainObject(sort)) {
      throw new TypeError(`Impute sortBy[${index}] must be a plain object.`);
    }
    rejectUnknownKeys(sort, SORT_KEYS, `impute sortBy[${index}]`);
    fields.push(requireField(sort.field, `Impute sortBy[${index}].field`));
    if (!["ascending", "descending"].includes(sort.order)) {
      throw new Error(`Unsupported impute sort order "${sort.order}".`);
    }
  });
  if (new Set(fields).size !== fields.length) {
    throw new Error("Impute sortBy fields must be unique.");
  }
}

function scalarType(value, label) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" || typeof value === "boolean") return typeof value;
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  throw new TypeError(`${label} must contain scalar values; NaN and Infinity are invalid.`);
}

function scalarKey(value, label) {
  const type = scalarType(value, label);
  if (type === undefined) return "null";
  if (type === "number") return `number:${Object.is(value, -0) ? 0 : value}`;
  if (type === "string") return `string:${value.length}:${value}`;
  return `${type}:${value}`;
}

export function validateImputeTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Impute transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "impute transform");
  if (transform.type !== "impute") {
    throw new Error(`Unsupported impute transform "${transform.type}".`);
  }
  validateFieldList(transform.fields, "Impute fields");
  if (!Array.isArray(transform.groupBy) || transform.groupBy.some(field =>
    typeof field !== "string" || field.length === 0
  )) {
    throw new TypeError("Impute groupBy must contain field names.");
  }
  if (new Set(transform.groupBy).size !== transform.groupBy.length) {
    throw new Error("Impute groupBy fields must be unique.");
  }
  validateSortBy(transform.sortBy);
  if (!METHODS.includes(transform.method)) {
    throw new Error(`Unsupported impute method "${transform.method}".`);
  }
  const hasValue = Object.hasOwn(transform, "value");
  if (IMPUTE_REQUIRED_OPTIONS[transform.method].includes("value")) {
    if (!hasValue) throw new TypeError("Impute constant requires a value.");
    if (transform.value === undefined) {
      throw new TypeError("Impute constant value must be a JSON-safe scalar.");
    }
    scalarType(transform.value, "Impute constant value");
  } else {
    if (hasValue) throw new Error(`Impute value is not available for ${transform.method}.`);
    if (transform.sortBy.length === 0) {
      throw new Error(`Impute ${transform.method} requires non-empty sortBy.`);
    }
  }
  if (transform.method === "linear") {
    if (transform.sortBy.length !== 1 || transform.sortBy[0].order !== "ascending") {
      throw new Error("Impute linear requires exactly one ascending sortBy field.");
    }
  }
  if (!['keep', 'error'].includes(transform.edges)) {
    throw new Error(`Unsupported impute edges policy "${transform.edges}".`);
  }
  if (transform.maxGap !== undefined &&
    (!Number.isSafeInteger(transform.maxGap) || transform.maxGap <= 0)) {
    throw new RangeError("Impute maxGap must be a positive safe integer.");
  }
  return transform;
}

export function normalizeImputeTransform(args = {}) {
  const transform = {
    type: "impute",
    fields: normalizeFieldList(args.fields),
    groupBy: normalizeFieldList(args.groupBy, { allowEmpty: true }),
    sortBy: normalizeSortBy(args.sortBy),
    method: args.method,
    edges: args.edges ?? "keep"
  };
  if (Object.hasOwn(args, "value")) transform.value = args.value;
  if (Object.hasOwn(args, "maxGap")) transform.maxGap = args.maxGap;
  validateImputeTransform(transform);
  return cloneAndFreeze(transform);
}

function compareScalar(left, right, label) {
  const leftType = scalarType(left, label);
  const rightType = scalarType(right, label);
  if (leftType === undefined || rightType === undefined) {
    if (leftType === rightType) return 0;
    return leftType === undefined ? 1 : -1;
  }
  if (leftType !== rightType) throw new TypeError(`${label} must contain one scalar type.`);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareEntries(left, right, sortBy) {
  for (const sort of sortBy) {
    const comparison = compareScalar(
      left.row[sort.field], right.row[sort.field], `Impute sort field "${sort.field}"`
    );
    if (comparison !== 0) return sort.order === "ascending" ? comparison : -comparison;
  }
  return left.index - right.index;
}

function validateRows(rows, transform) {
  if (!Array.isArray(rows) || !rows.every(isPlainObject)) {
    throw new TypeError("Impute source rows must be plain objects.");
  }
  const required = [...transform.fields, ...transform.groupBy,
    ...transform.sortBy.map(sort => sort.field)];
  rows.forEach((row, index) => {
    for (const field of required) {
      if (!Object.hasOwn(row, field)) {
        throw new Error(`Impute source does not contain field "${field}" at row ${index}.`);
      }
    }
    for (const field of transform.fields) {
      scalarType(row[field], `Impute field "${field}" at row ${index}`);
    }
    for (const field of transform.groupBy) {
      scalarKey(row[field], `Impute group field "${field}" at row ${index}`);
    }
    for (const sort of transform.sortBy) {
      scalarType(row[sort.field], `Impute sort field "${sort.field}" at row ${index}`);
    }
  });
}

function partitions(entries, transform) {
  const groups = new Map();
  for (const entry of entries) {
    const key = transform.groupBy.length === 0 ? "all" : transform.groupBy.map(field =>
      scalarKey(entry.row[field], `Impute group field "${field}"`)
    ).join("\0");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return [...groups.values()];
}

function validateFieldTypes(entries, transform) {
  for (const field of transform.fields) {
    const types = new Set(entries.flatMap(entry => {
      const type = scalarType(entry.row[field], `Impute field "${field}"`);
      return type === undefined ? [] : [type];
    }));
    const constantType = transform.method === "constant"
      ? scalarType(transform.value, "Impute constant value")
      : undefined;
    if (constantType !== undefined) types.add(constantType);
    if (types.size > 1) {
      throw new TypeError(`Impute field "${field}" must contain one scalar type.`);
    }
    if (transform.method === "linear" &&
      (types.size > 0 && !types.has("number"))) {
      throw new TypeError(`Impute linear field "${field}" must contain finite numbers.`);
    }
  }
}

function validateSortFieldTypes(partition, transform) {
  for (const sort of transform.sortBy) {
    const types = new Set(partition.flatMap(entry => {
      const type = scalarType(
        entry.row[sort.field],
        `Impute sort field "${sort.field}"`
      );
      return type === undefined ? [] : [type];
    }));
    if (types.size > 1) {
      throw new TypeError(`Impute sort field "${sort.field}" must contain one scalar type.`);
    }
  }
}

function linearPositions(partition, transform) {
  if (transform.method !== "linear") return undefined;
  const field = transform.sortBy[0].field;
  const types = new Set(partition.map((entry, index) =>
    scalarType(entry.row[field], `Impute linear sort field "${field}" at row ${index}`)
  ));
  if (types.size !== 1 || types.has(undefined) ||
    !["number", "string"].includes([...types][0])) {
    throw new TypeError("Impute linear sort field must contain one numeric or temporal-string type.");
  }
  const type = [...types][0];
  const positions = partition.map((entry, index) => type === "number"
    ? entry.row[field]
    : normalizeTemporalValue(entry.row[field], field, index, "auto")
  );
  for (let index = 1; index < positions.length; index += 1) {
    if (positions[index] === positions[index - 1]) {
      throw new Error("Impute linear sort positions must be unique.");
    }
  }
  return positions;
}

function missingRuns(partition, field) {
  const runs = [];
  let start;
  for (let index = 0; index <= partition.length; index += 1) {
    const missing = index < partition.length &&
      (partition[index].row[field] === null || partition[index].row[field] === undefined);
    if (missing && start === undefined) start = index;
    if (!missing && start !== undefined) {
      runs.push([start, index - 1]);
      start = undefined;
    }
  }
  return runs;
}

function setField(row, field, value) {
  Object.defineProperty(row, field, {
    value, enumerable: true, writable: true, configurable: true
  });
}

function fillRun(partition, field, run, transform, positions) {
  const [start, end] = run;
  const length = end - start + 1;
  if (transform.maxGap !== undefined && length > transform.maxGap) return;
  if (transform.method === "constant") {
    for (let index = start; index <= end; index += 1) {
      setField(partition[index].row, field, transform.value);
    }
    return;
  }
  const left = start - 1;
  const right = end + 1;
  const hasLeft = left >= 0;
  const hasRight = right < partition.length;
  const usable = transform.method === "forward" ? hasLeft
    : transform.method === "backward" ? hasRight
      : hasLeft && hasRight;
  if (!usable) {
    if (transform.edges === "error") {
      throw new RangeError(`Impute ${transform.method} cannot fill an edge run in field "${field}".`);
    }
    return;
  }
  if (transform.method === "forward" || transform.method === "backward") {
    const anchor = transform.method === "forward" ? left : right;
    const value = partition[anchor].row[field];
    for (let index = start; index <= end; index += 1) {
      setField(partition[index].row, field, value);
    }
    return;
  }
  const leftValue = partition[left].row[field];
  const rightValue = partition[right].row[field];
  for (let index = start; index <= end; index += 1) {
    const proportion = inverseLerp(positions[index], positions[left], positions[right]);
    setField(
      partition[index].row,
      field,
      interpolateNumber(leftValue, rightValue, proportion)
    );
  }
}

export function deriveImputedRows(rows, transform) {
  validateImputeTransform(transform);
  validateRows(rows, transform);
  const entries = rows.map((row, index) => ({ index, row: { ...row } }));
  validateFieldTypes(entries, transform);
  const groups = partitions(entries, transform);
  for (const partition of groups) {
    validateSortFieldTypes(partition, transform);
    partition.sort((left, right) => compareEntries(left, right, transform.sortBy));
    const positions = linearPositions(partition, transform);
    for (const field of transform.fields) {
      for (const run of missingRuns(partition, field)) {
        fillRun(partition, field, run, transform, positions);
      }
    }
  }
  return cloneAndFreeze(entries.sort((a, b) => a.index - b.index).map(entry => entry.row));
}
