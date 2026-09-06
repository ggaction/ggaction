import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import {
  aggregateRows,
  isScalarAggregate,
  validateAggregate,
  validateAggregateFieldValues
} from "./aggregate.js";

const TRANSFORM_KEYS = Object.freeze([
  "type", "groupBy", "aggregates", "members"
]);
const AGGREGATE_KEYS = Object.freeze(["op", "field", "as"]);
const NOMINAL_OPERATIONS = new Set(["distinct", "valid", "missing"]);
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

function normalizeGroupBy(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? [...value] : [value];
}

function normalizeAggregate(value) {
  if (!isPlainObject(value)) return value;
  return {
    ...value,
    op: validateAggregate(value.op),
    ...(Object.hasOwn(value, "field") ? { field: value.field } : {}),
    as: value.as
  };
}

export function normalizeSummaryTransform({ groupBy, aggregates, members } = {}) {
  const transform = {
    type: "summary",
    groupBy: normalizeGroupBy(groupBy),
    aggregates: Array.isArray(aggregates)
      ? aggregates.map(normalizeAggregate)
      : aggregates,
    ...(members === undefined ? {} : { members })
  };
  validateSummaryTransform(transform);
  return cloneAndFreeze(transform);
}

export function validateSummaryTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Summary transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "summary transform");
  if (transform.type !== "summary") {
    throw new Error(`Unsupported summary transform "${transform.type}".`);
  }
  if (
    !Array.isArray(transform.groupBy) ||
    transform.groupBy.some(field => typeof field !== "string" || field.length === 0)
  ) {
    throw new TypeError("Summary groupBy must contain field names.");
  }
  if (new Set(transform.groupBy).size !== transform.groupBy.length) {
    throw new Error("Summary groupBy fields must be unique.");
  }
  if (!Array.isArray(transform.aggregates) || transform.aggregates.length === 0) {
    throw new TypeError("Summary aggregates must be a non-empty array.");
  }
  if (transform.aggregates.length > 64) {
    throw new RangeError("Summary aggregates cannot contain more than 64 outputs.");
  }
  const outputs = new Set(transform.groupBy);
  transform.aggregates.forEach((aggregate, index) => {
    if (!isPlainObject(aggregate)) {
      throw new TypeError(`Summary aggregate ${index} must be a plain object.`);
    }
    rejectUnknownKeys(aggregate, AGGREGATE_KEYS, `summary aggregate ${index}`);
    const operation = validateAggregate(aggregate.op);
    if (operation === "count") {
      if (Object.hasOwn(aggregate, "field")) {
        throw new Error("Summary count does not accept a field.");
      }
    } else {
      requireField(aggregate.field, `Summary aggregate ${index} field`);
    }
    const output = requireField(aggregate.as, `Summary aggregate ${index} as`);
    if (outputs.has(output)) {
      throw new Error(`Summary output field "${output}" collides with another output.`);
    }
    outputs.add(output);
  });
  if (transform.members !== undefined) {
    const members = requireField(transform.members, "Summary members");
    if (outputs.has(members)) {
      throw new Error(`Summary members field "${members}" collides with another output.`);
    }
  }
  return transform;
}

function scalarKey(value, label) {
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

function requireSourceFields(rows, transform) {
  if (rows.length === 0) return;
  const fields = new Set(rows.flatMap(row => Object.keys(row)));
  for (const field of transform.groupBy) {
    if (!fields.has(field)) {
      throw new Error(`Summary source does not contain group field "${field}".`);
    }
  }
  for (const aggregate of transform.aggregates) {
    if (aggregate.field !== undefined && !fields.has(aggregate.field)) {
      throw new Error(`Summary source does not contain aggregate field "${aggregate.field}".`);
    }
    const orderBy = isPlainObject(aggregate.op) ? aggregate.op.orderBy : undefined;
    if (orderBy !== undefined && !fields.has(orderBy)) {
      throw new Error(`Summary source does not contain order field "${orderBy}".`);
    }
  }
}

function validateAggregateValues(rows, aggregate) {
  if (aggregate.op === "count") return;
  if (isScalarAggregate(aggregate.op) && NOMINAL_OPERATIONS.has(aggregate.op)) {
    validateAggregateFieldValues(rows, aggregate.field, "nominal");
    return;
  }
  validateAggregateFieldValues(rows, aggregate.field, "quantitative");
}

export function deriveSummaryRows(rows, transform) {
  validateSummaryTransform(transform);
  requireSourceFields(rows, transform);
  for (const aggregate of transform.aggregates) {
    validateAggregateValues(rows, aggregate);
  }

  const groups = new Map();
  if (transform.groupBy.length === 0) {
    groups.set("all", { values: {}, rows });
  } else {
    rows.forEach(row => {
      const values = Object.fromEntries(transform.groupBy.map(field => [field, row[field]]));
      const key = transform.groupBy.map(field =>
        scalarKey(row[field], `Summary group field "${field}"`)
      ).join("|");
      const group = groups.get(key) ?? { values, rows: [] };
      group.rows.push(row);
      groups.set(key, group);
    });
  }
  if (groups.size > MAX_OUTPUT_ROWS) {
    throw new RangeError(`Summary output cannot exceed ${MAX_OUTPUT_ROWS} groups.`);
  }

  return [...groups.values()].map(group => ({
    ...group.values,
    ...Object.fromEntries(transform.aggregates.map(aggregate => [
      aggregate.as,
      aggregateRows(group.rows, aggregate.field ?? "__row", aggregate.op)
    ])),
    ...(transform.members === undefined ? {} : { [transform.members]: group.rows })
  }));
}
