import { aggregateRows } from "./aggregate.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const STATISTIC_KEYS = Object.freeze(["op", "p"]);
const SIMPLE_STATISTICS = new Set(["mean", "median", "min", "max"]);
const POPULATIONS = new Set(["boundData", "visibleItems"]);
const TRANSFORM_KEYS = Object.freeze(["type", "target"]);

function rejectUnknownKeys(value, supported, label) {
  const unknown = Object.keys(value).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown ${label} property "${unknown}".`);
  }
}

export function normalizeReferenceStatistic(value, label = "Reference statistic") {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  rejectUnknownKeys(value, STATISTIC_KEYS, label.toLowerCase());
  if (SIMPLE_STATISTICS.has(value.op)) {
    if (Object.hasOwn(value, "p")) {
      throw new Error(`${label} ${value.op} does not accept p.`);
    }
    return cloneAndFreeze({ op: value.op });
  }
  if (value.op !== "quantile") {
    throw new Error(`Unsupported ${label.toLowerCase()} "${value.op ?? "unknown"}".`);
  }
  if (!Number.isFinite(value.p) || value.p < 0 || value.p > 1) {
    throw new RangeError(`${label} quantile p must be between 0 and 1.`);
  }
  return cloneAndFreeze({ op: "quantile", p: value.p });
}

export function normalizeReferenceStatistics(value, count, label) {
  if (!Array.isArray(value) || value.length !== count) {
    throw new TypeError(`${label} requires exactly ${count} statistic${count === 1 ? "" : "s"}.`);
  }
  return Object.freeze(value.map((statistic, index) =>
    normalizeReferenceStatistic(statistic, `${label} statistic ${index + 1}`)
  ));
}

export function normalizeReferencePopulation(value, label = "Reference population") {
  const population = value ?? "boundData";
  if (!POPULATIONS.has(population)) {
    throw new Error(`${label} must be boundData or visibleItems.`);
  }
  return population;
}

export function normalizeReferenceField(value, label = "Reference field") {
  if (value === undefined) return cloneAndFreeze({ kind: "axis" });
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return cloneAndFreeze({ kind: "explicit", field: value });
}

export function normalizeStatisticalReferenceTransform({ target } = {}) {
  const transform = { type: "statisticalReference", target };
  validateStatisticalReferenceTransform(transform);
  return cloneAndFreeze(transform);
}

export function validateStatisticalReferenceTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Statistical reference transform must be a plain object.");
  }
  rejectUnknownKeys(
    transform,
    TRANSFORM_KEYS,
    "statistical reference transform"
  );
  if (transform.type !== "statisticalReference") {
    throw new Error(`Unsupported statistical reference transform "${transform.type}".`);
  }
  if (typeof transform.target !== "string" || transform.target.length === 0) {
    throw new TypeError("Statistical reference transform target must be a non-empty string.");
  }
  return transform;
}

export function deriveStatisticalReferenceValues(values, statistics, label) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${label} population must contain at least one value.`);
  }
  values.forEach((value, index) => {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `${label} population value ${index} must be a finite number.`
      );
    }
  });
  return statistics.map(statistic => aggregateRows(
    values.map(value => ({ value })),
    "value",
    statistic.op === "quantile"
      ? { op: "quantile", probability: statistic.p }
      : statistic.op
  ));
}
