import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import {
  aggregateRows,
  isScalarAggregate,
  validateAggregate,
  validateAggregateFieldValues
} from "./aggregate.js";
import {
  calculateWeightedAggregate,
  normalizeStatisticalWeight,
  readStatisticalWeights,
  summarizeStatisticalWeights,
  validateWeightedAggregate,
  validateWeightedNumericFields,
  weightedRows
} from "./weightedStatistics.js";

const TRANSFORM_KEYS = Object.freeze([
  "type", "groupBy", "aggregates", "members", "weight", "missing", "empty"
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

export function normalizeSummaryTransform({ groupBy, aggregates, members, weight, missing, empty } = {}) {
  const transform = {
    type: "summary",
    groupBy: normalizeGroupBy(groupBy),
    aggregates: Array.isArray(aggregates)
      ? aggregates.map(normalizeAggregate)
      : aggregates,
    ...(members === undefined ? {} : { members }),
    ...(weight === undefined
      ? {}
      : { weight: normalizeStatisticalWeight(weight, "Summary weight") }),
    ...(missing === undefined ? {} : { missing }),
    ...(empty === undefined ? {} : { empty })
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
    if (transform.weight !== undefined) validateWeightedAggregate(operation);
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
  if (transform.weight !== undefined) {
    normalizeStatisticalWeight(transform.weight, "Summary weight");
  }
  if (transform.missing !== undefined && !["error", "drop"].includes(transform.missing)) {
    throw new Error('Summary missing must be "error" or "drop".');
  }
  if (transform.empty !== undefined && !["null", "identity"].includes(transform.empty)) {
    throw new Error('Summary empty must be "null" or "identity".');
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
  if (transform.weight !== undefined && !fields.has(transform.weight.field)) {
    throw new Error(`Summary source does not contain weight field "${transform.weight.field}".`);
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
  const explicitWeighted = transform.weight !== undefined && transform.missing !== undefined;
  let weightEntries;
  if (transform.weight === undefined) {
    for (const aggregate of transform.aggregates) {
      validateAggregateValues(rows, aggregate);
    }
  } else if (!explicitWeighted) {
    weightEntries = readStatisticalWeights(rows, transform.weight, "Summary").entries;
    validateWeightedNumericFields(
      weightEntries,
      [...new Set(transform.aggregates.flatMap(aggregate =>
        aggregate.field === undefined ? [] : [aggregate.field]
      ))],
      "Summary"
    );
  } else {
    // Explicit missing policy is evaluated per measure. Validate every
    // nonmissing value now, while leaving nullish value/weight pairs for the
    // reason-priority accounting below.
    readStatisticalWeights(
      rows.filter(row => row[transform.weight.field] !== null && row[transform.weight.field] !== undefined),
      transform.weight,
      "Summary"
    );
    for (const aggregate of transform.aggregates) {
      if (aggregate.field === undefined) continue;
      validateAggregateValues(
        rows.filter(row => row[aggregate.field] !== null && row[aggregate.field] !== undefined),
        aggregate
      );
    }
  }
  if (transform.missing === "error") {
    if (transform.weight !== undefined) {
      const weightIndex = rows.findIndex(row =>
        row[transform.weight.field] === null || row[transform.weight.field] === undefined
      );
      if (weightIndex !== -1) {
        throw new TypeError(`Summary weight "${transform.weight.field}" is missing at row ${weightIndex}.`);
      }
    }
    for (const aggregate of transform.aggregates) {
      if (aggregate.field === undefined) continue;
      const index = rows.findIndex(row => row[aggregate.field] === null || row[aggregate.field] === undefined);
      if (index !== -1) throw new TypeError(`Summary field "${aggregate.field}" is missing at row ${index}.`);
    }
  }

  const groups = new Map();
  if (transform.groupBy.length === 0) {
    groups.set("all", {
      values: {},
      rows,
      ...(weightEntries === undefined ? {} : { entries: weightEntries })
    });
  } else {
    rows.forEach((row, index) => {
      const values = Object.fromEntries(transform.groupBy.map(field => [field, row[field]]));
      const key = transform.groupBy.map(field =>
        scalarKey(row[field], `Summary group field "${field}"`)
      ).join("|");
      const group = groups.get(key) ?? {
        values,
        rows: [],
        ...(weightEntries === undefined ? {} : { entries: [] })
      };
      group.rows.push(row);
      if (weightEntries !== undefined) group.entries.push(weightEntries[index]);
      groups.set(key, group);
    });
  }
  if (groups.size > MAX_OUTPUT_ROWS) {
    throw new RangeError(`Summary output cannot exceed ${MAX_OUTPUT_ROWS} groups.`);
  }

  const units = [];
  const values = [...groups.values()].map(group => {
    const sharedWeightSummary = transform.weight === undefined || explicitWeighted
      ? undefined
      : summarizeStatisticalWeights(
          group.entries,
          transform.weight.kind,
          "Summary group"
        );
    const aggregated = Object.fromEntries(transform.aggregates.map(aggregate => {
      let missingValue = 0;
      let missingWeight = 0;
      let zeroWeightRows = 0;
      let measureWeightSummary = sharedWeightSummary;
      if (explicitWeighted) {
        const eligible = group.rows.filter(row => {
          if (aggregate.field !== undefined &&
              (row[aggregate.field] === null || row[aggregate.field] === undefined)) {
            missingValue += 1;
            return false;
          }
          if (row[transform.weight.field] === null || row[transform.weight.field] === undefined) {
            missingWeight += 1;
            return false;
          }
          return true;
        });
        const entries = readStatisticalWeights(eligible, transform.weight, "Summary").entries;
        zeroWeightRows = entries.filter(entry => entry.weight === 0).length;
        measureWeightSummary = summarizeStatisticalWeights(
          entries,
          transform.weight.kind,
          "Summary group"
        );
      }
      let value = measureWeightSummary === undefined
        ? aggregateRows(group.rows, aggregate.field ?? "__row", aggregate.op)
        : calculateWeightedAggregate(
            measureWeightSummary,
            aggregate.field,
            aggregate.op,
            `Summary aggregate "${aggregate.as}"`
          );
      if (value === undefined && transform.empty !== undefined) {
        const op = typeof aggregate.op === "string" ? aggregate.op : aggregate.op.op;
        value = transform.empty === "identity" && op === "sum" ? 0 : null;
      }
      if (transform.missing !== undefined || transform.empty !== undefined) {
        const missing = explicitWeighted
          ? missingValue + missingWeight
          : aggregate.field === undefined ? 0 : group.rows.filter(row => row[aggregate.field] === null || row[aggregate.field] === undefined).length;
        units.push({
          role: aggregate.as,
          group: group.values,
          inputRows: group.rows.length,
          usedRows: group.rows.length - missing,
          excludedRows: missing,
          excludedByReason: missing === 0 ? {} : {
            ...(missingValue === 0 && explicitWeighted ? {} : { "missing-value": explicitWeighted ? missingValue : missing }),
            ...(missingWeight === 0 ? {} : { "missing-weight": missingWeight })
          },
          ...(explicitWeighted ? { zeroWeightRows } : {})
        });
      }
      return [aggregate.as, value];
    }));
    return {
      ...group.values,
      ...aggregated,
      ...(transform.members === undefined
        ? {}
        : {
            [transform.members]: sharedWeightSummary === undefined
              ? group.rows
              : weightedRows(sharedWeightSummary)
          })
    };
  });
  if (transform.missing === undefined && transform.empty === undefined) return values;
  return {
    values,
    report: cloneAndFreeze({
      version: 1,
      owner: { kind: "data", id: "pending" },
      inputs: [],
      units
    })
  };
}
