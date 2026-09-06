import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { layoutSeriesPartition } from "./seriesLayout.js";

const TRANSFORM_KEYS = Object.freeze([
  "type", "category", "group", "value", "mode", "as"
]);
const AS_KEYS = Object.freeze(["start", "end", "value", "share"]);
const MODES = new Set(["stack", "fill", "center", "diverging"]);
const MAX_OUTPUT_ROWS = 10_000;

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

function normalizeAs(value, field) {
  const requested = value ?? {};
  if (!isPlainObject(requested)) return requested;
  return {
    ...requested,
    start: requested.start ?? `${field}_start`,
    end: requested.end ?? `${field}_end`,
    value: requested.value ?? `${field}_value`,
    share: requested.share ?? `${field}_share`
  };
}

export function normalizeStackTransform({ category, group, value, mode, as } = {}) {
  const transform = {
    type: "stack",
    category,
    group,
    value,
    mode: mode ?? "stack",
    as: normalizeAs(as, value)
  };
  validateStackTransform(transform);
  return cloneAndFreeze(transform);
}

export function validateStackTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Stack transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "stack transform");
  if (transform.type !== "stack") {
    throw new Error(`Unsupported stack transform "${transform.type}".`);
  }
  const roles = [
    requireField(transform.category, "Stack category"),
    requireField(transform.group, "Stack group"),
    requireField(transform.value, "Stack value")
  ];
  if (new Set(roles).size !== roles.length) {
    throw new Error("Stack category, group, and value fields must be unique.");
  }
  if (!MODES.has(transform.mode)) {
    throw new Error(`Unsupported stack mode "${transform.mode}".`);
  }
  if (!isPlainObject(transform.as)) {
    throw new TypeError("Stack as must be a plain object.");
  }
  rejectUnknownKeys(transform.as, AS_KEYS, "stack as");
  const outputs = AS_KEYS.map(key => requireField(transform.as[key], `Stack as.${key}`));
  if (new Set(outputs).size !== outputs.length) {
    throw new Error("Stack output fields must be unique.");
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
  throw new TypeError(`${label} must contain null, strings, booleans, or finite numbers.`);
}

function resolvedPartition(entries, mode) {
  const values = entries.map(entry => entry.row.value);
  const segments = layoutSeriesPartition(values, mode);
  const byIndex = new Map(segments.map(segment => [segment.index, segment]));
  const shares = layoutSeriesPartition(values.map(Math.abs), "fill");
  const shareByIndex = new Map(shares.map(segment => [
    segment.index,
    segment.end - segment.start
  ]));
  let boundary = mode === "center" ? segments[0]?.start ?? 0 : 0;
  return entries.map((entry, index) => {
    const segment = byIndex.get(index);
    const start = segment?.start ?? (mode === "diverging" ? 0 : boundary);
    const end = segment?.end ?? start;
    if (segment !== undefined && mode !== "diverging") boundary = segment.end;
    return {
      index: entry.index,
      value: entry.row.value,
      start,
      end,
      share: shareByIndex.get(index) ?? 0
    };
  });
}

export function deriveStackRows(rows, transform) {
  validateStackTransform(transform);
  if (rows.length > MAX_OUTPUT_ROWS) {
    throw new RangeError(`Stack output cannot exceed ${MAX_OUTPUT_ROWS} rows.`);
  }
  const sourceFields = new Set(rows.flatMap(row => Object.keys(row)));
  for (const output of Object.values(transform.as)) {
    if (sourceFields.has(output)) {
      throw new Error(`Stack output field "${output}" already exists.`);
    }
  }
  const partitions = new Map();
  const groups = new Map();
  rows.forEach((source, index) => {
    for (const field of [transform.category, transform.group, transform.value]) {
      if (!Object.hasOwn(source, field)) {
        throw new Error(`Stack source does not contain field "${field}" at row ${index}.`);
      }
    }
    const categoryKey = scalarKey(source[transform.category], "Stack category field");
    const groupKey = scalarKey(source[transform.group], "Stack group field");
    if (!Number.isFinite(source[transform.value])) {
      throw new TypeError(
        `Stack value field "${transform.value}" must contain a finite number at row ${index}.`
      );
    }
    if (!groups.has(groupKey)) groups.set(groupKey, groups.size);
    let partition = partitions.get(categoryKey);
    if (partition === undefined) {
      partition = new Map();
      partitions.set(categoryKey, partition);
    }
    if (partition.has(groupKey)) {
      throw new Error("Stack source requires one row per category/group cell.");
    }
    partition.set(groupKey, {
      index,
      row: { groupKey, value: source[transform.value] }
    });
  });

  const resolved = new Array(rows.length);
  for (const partition of partitions.values()) {
    const entries = [...partition.values()].sort((left, right) =>
      groups.get(left.row.groupKey) - groups.get(right.row.groupKey)
    );
    for (const item of resolvedPartition(entries, transform.mode)) {
      resolved[item.index] = item;
    }
  }
  return rows.map((row, index) => ({
    ...row,
    [transform.as.start]: resolved[index].start,
    [transform.as.end]: resolved[index].end,
    [transform.as.value]: resolved[index].value,
    [transform.as.share]: resolved[index].share
  }));
}
