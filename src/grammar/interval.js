import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { aggregateScalarValues } from "./aggregate.js";
import { requireFiniteResult, stableDecimal } from "./numeric.js";
import {
  confidenceCriticalValue,
  normalizeConfidenceInterval
} from "./statistics/confidenceInterval.js";

const CENTER_VALUES = ["mean", "median"];
const EXTENT_VALUES = ["stderr", "stdev", "ci", "iqr"];
const TRANSFORM_KEYS = [
  "type",
  "field",
  "groupBy",
  "center",
  "extent",
  "method",
  "level",
  "as"
];
const OUTPUT_KEYS = ["center", "lower", "upper"];

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function validateGrouping(groupBy) {
  if (
    !Array.isArray(groupBy) ||
    !groupBy.every(field => typeof field === "string" && field.length > 0) ||
    new Set(groupBy).size !== groupBy.length
  ) {
    throw new TypeError(
      "Interval groupBy must contain unique field names."
    );
  }
}

function validateOutputs(as, occupied) {
  if (!isPlainObject(as)) {
    throw new TypeError("Interval as must be a plain object.");
  }
  const keys = Object.keys(as);
  if (
    keys.length !== OUTPUT_KEYS.length ||
    !OUTPUT_KEYS.every(key => Object.hasOwn(as, key))
  ) {
    throw new Error("Interval as requires exactly center, lower, and upper.");
  }
  const values = OUTPUT_KEYS.map(key => as[key]);
  values.forEach((value, index) => {
    nonEmptyString(value, `Interval as.${OUTPUT_KEYS[index]}`);
  });
  if (new Set(values).size !== values.length) {
    throw new Error("Interval output fields must be distinct.");
  }
  if (values.some(value => occupied.has(value))) {
    throw new Error("Interval output fields must not collide with input fields.");
  }
}

export function validateIntervalTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Interval transform must be a plain object.");
  }
  const unknown = Object.keys(transform).find(
    key => !TRANSFORM_KEYS.includes(key)
  );
  if (unknown !== undefined) {
    throw new Error(`Unknown interval transform property "${unknown}".`);
  }
  if (transform.type !== "interval") {
    throw new Error(`Unsupported interval transform "${transform.type}".`);
  }
  nonEmptyString(transform.field, "Interval field");
  validateGrouping(transform.groupBy);
  if (!CENTER_VALUES.includes(transform.center)) {
    throw new Error(`Unsupported interval center "${transform.center}".`);
  }
  if (!EXTENT_VALUES.includes(transform.extent)) {
    throw new Error(`Unsupported interval extent "${transform.extent}".`);
  }
  if (
    (transform.center === "median") !== (transform.extent === "iqr")
  ) {
    throw new Error("Median intervals require iqr, and iqr requires median.");
  }
  if (transform.extent === "ci") {
    normalizeConfidenceInterval(transform, {
      defaultMethod: "student-t",
      label: "Interval CI"
    });
  } else if (transform.method !== undefined) {
    throw new Error("Interval method is supported only for ci extent.");
  } else if (transform.level !== undefined) {
    throw new Error("Interval level is supported only for ci extent.");
  }
  validateOutputs(
    transform.as,
    new Set([transform.field, ...transform.groupBy])
  );
}

function normalizeGrouping(groupBy) {
  const values = groupBy === undefined
    ? []
    : Array.isArray(groupBy) ? [...groupBy] : [groupBy];
  validateGrouping(values);
  return values;
}

export function normalizeIntervalParameters({
  center = "mean",
  extent = "ci",
  method,
  level
} = {}) {
  const confidence = extent === "ci"
    ? normalizeConfidenceInterval({ method, level }, {
        defaultMethod: "student-t",
        label: "Interval CI"
      })
    : undefined;
  const candidate = {
    type: "interval",
    field: "__interval_input",
    groupBy: [],
    center,
    extent,
    ...(confidence === undefined
      ? {
          ...(method === undefined ? {} : { method }),
          ...(level === undefined ? {} : { level })
        }
      : confidence),
    as: {
      center: "__interval_center",
      lower: "__interval_lower",
      upper: "__interval_upper"
    }
  };
  validateIntervalTransform(candidate);
  return cloneAndFreeze({
    center,
    extent,
    ...(confidence === undefined ? {} : confidence)
  });
}

export function studentTCritical(degreesOfFreedom, level) {
  return confidenceCriticalValue({
    method: "student-t",
    level,
    degreesOfFreedom
  });
}

function isMissing(value) {
  return value === undefined || value === null ||
    (typeof value === "number" && Number.isNaN(value));
}

function isGroupValue(value) {
  return typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
}

function deriveGroup(values, transform) {
  if (transform.center === "median") {
    if (values.length === 0) return undefined;
    return {
      center: aggregateScalarValues(values, "median"),
      lower: aggregateScalarValues(values, "q1"),
      upper: aggregateScalarValues(values, "q3")
    };
  }
  if (values.length < 2) return undefined;
  const center = aggregateScalarValues(values, "mean");
  const spread = transform.extent === "stdev"
    ? aggregateScalarValues(values, "stdev")
    : transform.extent === "stderr"
      ? aggregateScalarValues(values, "stderr")
      : confidenceCriticalValue({
          method: transform.method,
          level: transform.level,
          degreesOfFreedom: values.length - 1
        }) *
        aggregateScalarValues(values, "stderr");
  return {
    center,
    lower: requireFiniteResult(center - spread, "Interval lower endpoint"),
    upper: requireFiniteResult(center + spread, "Interval upper endpoint")
  };
}

export function deriveInterval(rows, transform) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Interval rows must be an array.");
  }
  validateIntervalTransform(transform);
  const groups = new Map();
  for (const row of rows) {
    if (!isPlainObject(row)) continue;
    const value = row[transform.field];
    if (isMissing(value) || !Number.isFinite(value)) {
      if (value !== undefined && value !== null && typeof value !== "number") {
        throw new TypeError(
          `Interval field "${transform.field}" must contain numeric or missing values.`
        );
      }
      continue;
    }
    const groupValues = transform.groupBy.map(field => row[field]);
    if (groupValues.some(isMissing)) continue;
    if (!groupValues.every(isGroupValue)) {
      throw new TypeError("Interval grouping fields must contain nominal values.");
    }
    const key = JSON.stringify(groupValues);
    if (!groups.has(key)) {
      groups.set(key, {
        fields: Object.fromEntries(
          transform.groupBy.map((field, index) => [field, groupValues[index]])
        ),
        values: []
      });
    }
    groups.get(key).values.push(value);
  }

  const output = [];
  for (const group of groups.values()) {
    const result = deriveGroup(group.values, transform);
    if (result === undefined) continue;
    output.push({
      ...group.fields,
      [transform.as.center]: stableDecimal(result.center),
      [transform.as.lower]: stableDecimal(result.lower),
      [transform.as.upper]: stableDecimal(result.upper)
    });
  }
  return cloneAndFreeze(output);
}

export function normalizeIntervalTransform({
  field,
  groupBy,
  center,
  extent,
  method,
  level,
  as
}) {
  nonEmptyString(field, "Interval field");
  const grouping = normalizeGrouping(groupBy);
  const parameters = normalizeIntervalParameters({ center, extent, method, level });
  const transform = {
    type: "interval",
    field,
    groupBy: grouping,
    ...parameters,
    as
  };
  validateIntervalTransform(transform);
  return cloneAndFreeze(transform);
}
