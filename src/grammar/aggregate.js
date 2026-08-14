import { isPlainObject } from "../core/immutable.js";
import {
  interpolateNumber,
  numericExtent,
  requireFiniteResult,
  stableFiniteDeviation,
  stableFiniteMean,
  stableFiniteSum
} from "./numeric.js";

export const SCALAR_AGGREGATE_OPERATIONS = Object.freeze([
  "count", "sum", "mean", "median", "min", "max",
  "distinct", "valid", "missing",
  "variance", "varianceP", "stdev", "stdevP", "stderr",
  "q1", "q3", "ciLower", "ciUpper"
]);

const SCALAR_OPERATIONS = new Set(SCALAR_AGGREGATE_OPERATIONS);
const NOMINAL_OPERATIONS = ["count", "distinct", "valid", "missing"];
const PARAMETERIZED_OPERATIONS = ["quantile", "first", "last"];

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

export function isScalarAggregate(value) {
  return typeof value === "string" && SCALAR_OPERATIONS.has(value);
}

export function isParameterizedAggregate(value) {
  return isPlainObject(value) && PARAMETERIZED_OPERATIONS.includes(value.op);
}

export function isAggregate(value) {
  return isScalarAggregate(value) || isParameterizedAggregate(value);
}

export function validateAggregate(value) {
  if (typeof value === "string") {
    if (!SCALAR_OPERATIONS.has(value)) {
      throw new Error(`Unsupported aggregate "${value}".`);
    }
    return value;
  }
  if (!isPlainObject(value)) {
    throw new TypeError("Aggregate must be a supported operation or parameter object.");
  }
  if (value.op === "quantile") {
    const unknown = Object.keys(value).find(
      key => !["op", "probability"].includes(key)
    );
    if (unknown !== undefined) {
      throw new Error(`Unknown quantile aggregate property "${unknown}".`);
    }
    if (
      !Number.isFinite(value.probability) ||
      value.probability < 0 ||
      value.probability > 1
    ) {
      throw new RangeError("Quantile probability must be between 0 and 1.");
    }
    return { op: "quantile", probability: value.probability };
  }
  if (value.op === "first" || value.op === "last") {
    const unknown = Object.keys(value).find(
      key => !["op", "orderBy", "order"].includes(key)
    );
    if (unknown !== undefined) {
      throw new Error(`Unknown ordered aggregate property "${unknown}".`);
    }
    nonEmptyString(value.orderBy, "Ordered aggregate orderBy");
    if (
      value.order !== undefined &&
      !["ascending", "descending"].includes(value.order)
    ) {
      throw new Error(`Unsupported ordered aggregate order "${value.order}".`);
    }
    return {
      op: value.op,
      orderBy: value.orderBy,
      order: value.order ?? "ascending"
    };
  }
  throw new Error(`Unsupported aggregate "${value.op}".`);
}

export function validateAggregateFieldType(operation, fieldType) {
  const aggregate = validateAggregate(operation);
  if (isScalarAggregate(aggregate)) {
    return validateScalarAggregateFieldType(aggregate, fieldType);
  }
  if (fieldType === "quantitative") return fieldType;
  throw new Error(
    `Aggregate "${aggregate.op}" does not support field type "${fieldType}".`
  );
}

export function validateScalarAggregateFieldType(operation, fieldType) {
  validateAggregate(operation);
  if (!isScalarAggregate(operation)) {
    throw new Error("Scalar aggregate calculation requires a scalar operation.");
  }
  if (fieldType === "quantitative") return fieldType;
  if (fieldType === "nominal" && NOMINAL_OPERATIONS.includes(operation)) {
    return fieldType;
  }
  throw new Error(
    `Aggregate "${operation}" does not support field type "${fieldType}".`
  );
}

function isMissing(value) {
  return value === null || value === undefined ||
    (typeof value === "number" && Number.isNaN(value));
}

function isNominal(value) {
  return typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
}

export function validateAggregateFieldValues(rows, field, fieldType) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Aggregate rows must be an array.");
  }
  nonEmptyString(field, "Aggregate field");
  for (const row of rows) {
    const value = row[field];
    if (isMissing(value)) continue;
    if (fieldType === "quantitative" && typeof value !== "number") {
      throw new TypeError(`Aggregate field "${field}" must contain numeric or missing values.`);
    }
    if (fieldType === "nominal" && !isNominal(value)) {
      throw new TypeError(`Aggregate field "${field}" must contain nominal or missing values.`);
    }
  }
}

function finiteValues(values) {
  return values.filter(value => typeof value === "number" && Number.isFinite(value));
}

function quantile(values, probability) {
  const ordered = [...values].sort((left, right) => left - right);
  const position = (ordered.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return interpolateNumber(
    ordered[lower],
    ordered[upper],
    position - lower
  );
}

function comparableOrderKey(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { type: "number", value };
  }
  if (typeof value === "string") return { type: "string", value };
  if (typeof value === "boolean") return { type: "boolean", value: Number(value) };
  return undefined;
}

function compareOrderKeys(left, right) {
  if (left.value < right.value) return -1;
  if (left.value > right.value) return 1;
  return 0;
}

function aggregateOrderedRows(rows, field, aggregate) {
  const candidates = rows.flatMap((row, sourceIndex) => {
    const key = comparableOrderKey(row[aggregate.orderBy]);
    const value = row[field];
    return key === undefined || !Number.isFinite(value)
      ? []
      : [{ key, value, sourceIndex }];
  });
  if (candidates.length === 0) return undefined;
  const keyTypes = new Set(candidates.map(candidate => candidate.key.type));
  if (keyTypes.size !== 1) return undefined;
  const direction = aggregate.order === "descending" ? -1 : 1;
  candidates.sort((left, right) =>
    direction * compareOrderKeys(left.key, right.key) ||
    left.sourceIndex - right.sourceIndex
  );
  return aggregate.op === "first"
    ? candidates[0].value
    : candidates.at(-1).value;
}

export function aggregateScalarValues(values, operation) {
  if (!Array.isArray(values)) {
    throw new TypeError("Aggregate values must be an array.");
  }
  validateAggregate(operation);
  if (!isScalarAggregate(operation)) {
    throw new Error("Scalar aggregate calculation requires a scalar operation.");
  }

  if (operation === "count") return values.length;
  const valid = values.filter(value => !isMissing(value));
  if (operation === "valid") return valid.length;
  if (operation === "missing") return values.length - valid.length;
  if (operation === "distinct") return new Set(valid).size;

  const finite = finiteValues(values);
  if (finite.length === 0) return undefined;
  if (operation === "sum") {
    return stableFiniteSum(finite, "Aggregate sum");
  }
  if (operation === "min") return numericExtent(finite)[0];
  if (operation === "max") return numericExtent(finite)[1];
  if (operation === "median") return quantile(finite, 0.5);
  if (operation === "q1") return quantile(finite, 0.25);
  if (operation === "q3") return quantile(finite, 0.75);

  const mean = stableFiniteMean(finite, "Aggregate mean");
  if (operation === "mean") return mean;
  if (["variance", "varianceP", "stdev", "stdevP"].includes(operation)) {
    const population = operation.endsWith("P");
    if (!population && finite.length < 2) return undefined;
    const kind = population ? "population" : "sample";
    const deviation = stableFiniteDeviation(finite, {
      sample: !population,
      label: `Aggregate ${kind} deviation`
    });
    if (operation.startsWith("stdev")) return deviation.deviation;
    return deviation.squared === undefined
      ? requireFiniteResult(
          deviation.deviation ** 2,
          `Aggregate ${kind} variance`
        )
      : deviation.squared / (finite.length - (population ? 0 : 1));
  }
  if (finite.length < 2) return undefined;
  const stderr = stableFiniteDeviation(finite, {
    sample: true,
    divisor: Math.sqrt(finite.length),
    label: "Aggregate standard error"
  }).deviation;
  if (operation === "stderr") return stderr;
  if (operation === "ciLower") {
    return requireFiniteResult(mean - 1.96 * stderr, "Aggregate lower CI");
  }
  if (operation === "ciUpper") {
    return requireFiniteResult(mean + 1.96 * stderr, "Aggregate upper CI");
  }
  throw new Error(`Unsupported scalar aggregate "${operation}".`);
}

export function aggregateRows(rows, field, operation) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Aggregate rows must be an array.");
  }
  nonEmptyString(field, "Aggregate field");
  const aggregate = validateAggregate(operation);
  if (isScalarAggregate(aggregate)) {
    return aggregateScalarValues(rows.map(row => row[field]), aggregate);
  }
  if (aggregate.op === "quantile") {
    const values = finiteValues(rows.map(row => row[field]));
    return values.length === 0
      ? undefined
      : quantile(values, aggregate.probability);
  }
  return aggregateOrderedRows(rows, field, aggregate);
}

export function formatAggregateTitle(operation, field) {
  const aggregate = validateAggregate(operation);
  nonEmptyString(field, "Aggregate field");
  if (isScalarAggregate(aggregate)) return `${aggregate}(${field})`;
  if (aggregate.op === "quantile") {
    return `quantile(${field}, ${aggregate.probability})`;
  }
  return `${aggregate.op}(${field}, ${aggregate.orderBy} ${aggregate.order})`;
}
