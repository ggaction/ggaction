import { scalarKey, normalizeSortBy, validateSortBy } from "./transformKeys.js";
import { rejectUnknownProperties as rejectUnknownKeys } from "../core/validation.js";
import { requireStringValue as requireField } from "../core/validation.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import {
  maximumMagnitude,
  requireFiniteResult,
  stableFiniteMean,
  stableFinitePrefixSums,
  stableFiniteSum
} from "./numeric.js";
import { normalizeTemporalValue, validateTemporalUnit } from "./scales/fields.js";

const TRANSFORM_KEYS = [
  "type", "partitionBy", "sortBy", "operations", "temporalUnit"
];
const OPERATION_VALUES = [
  "rowNumber", "rank", "denseRank", "cumulativeSum", "lag", "lead",
  "movingMean", "movingSum"
];
const POSITION_OPERATIONS = new Set(OPERATION_VALUES.slice(0, 3));
const OFFSET_OPERATIONS = new Set(OPERATION_VALUES.slice(4, 6));
const MOVING_OPERATIONS = new Set(OPERATION_VALUES.slice(-2));
const FRAME_KEYS = ["preceding", "following", "duration"];
const DURATION_KEYS = ["preceding", "following", "unit"];
const DURATION_UNITS = Object.freeze({
  millisecond: 1,
  second: 1_000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000
});

function validateFieldList(value, label) {
  if (
    !Array.isArray(value) ||
    value.some(field => typeof field !== "string" || field.length === 0)
  ) {
    throw new TypeError(`${label} must contain field names.`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} fields must be unique.`);
  }
}

function operationKeys(operation) {
  if (POSITION_OPERATIONS.has(operation.op)) return ["op", "as"];
  if (operation.op === "cumulativeSum") return ["op", "field", "as"];
  if (OFFSET_OPERATIONS.has(operation.op)) {
    return ["op", "field", "as", "offset", "default"];
  }
  if (MOVING_OPERATIONS.has(operation.op)) {
    return ["op", "field", "as", "frame", "minPeriods", "missing"];
  }
  return ["op"];
}

function validateFrame(frame, operation) {
  if (!isPlainObject(frame)) {
    throw new TypeError(`Window ${operation} frame must be a plain object.`);
  }
  rejectUnknownKeys(frame, FRAME_KEYS, `window ${operation} frame`);
  const duration = Object.hasOwn(frame, "duration");
  const rows = ["preceding", "following"].some(field => Object.hasOwn(frame, field));
  if (duration === rows) {
    throw new Error(`Window ${operation} frame requires exactly one row or duration mode.`);
  }
  if (duration) {
    if (!isPlainObject(frame.duration)) {
      throw new TypeError(`Window ${operation} duration must be a plain object.`);
    }
    rejectUnknownKeys(frame.duration, DURATION_KEYS, `window ${operation} duration`);
    for (const field of ["preceding", "following"]) {
      if (!Number.isFinite(frame.duration[field]) || frame.duration[field] < 0) {
        throw new RangeError(
          `Window ${operation} duration ${field} must be a non-negative finite number.`
        );
      }
    }
    if (!Object.hasOwn(DURATION_UNITS, frame.duration.unit)) {
      throw new Error(`Unsupported window duration unit "${frame.duration.unit}".`);
    }
    return;
  }
  for (const field of ["preceding", "following"]) {
    if (!Number.isInteger(frame[field]) || frame[field] < 0) {
      throw new RangeError(
        `Window ${operation} frame ${field} must be a non-negative integer.`
      );
    }
  }
}

function validateOperations(operations, sortBy) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new TypeError("Window operations must be a non-empty array.");
  }
  const outputs = new Set();
  operations.forEach((operation, index) => {
    if (!isPlainObject(operation)) {
      throw new TypeError(`Window operation ${index} must be a plain object.`);
    }
    if (!OPERATION_VALUES.includes(operation.op)) {
      throw new Error(`Unsupported window operation "${operation.op}".`);
    }
    rejectUnknownKeys(operation, operationKeys(operation), `window operation ${index}`);
    const output = requireField(operation.as, `Window operation ${index} as`);
    if (outputs.has(output)) {
      throw new Error(`Window output field "${output}" must be unique.`);
    }
    outputs.add(output);
    if (["rank", "denseRank"].includes(operation.op) && sortBy.length === 0) {
      throw new Error(`${operation.op} requires a non-empty window sortBy.`);
    }
    if (!POSITION_OPERATIONS.has(operation.op)) {
      requireField(operation.field, `Window ${operation.op} field`);
    }
    if (OFFSET_OPERATIONS.has(operation.op)) {
      if (!Number.isInteger(operation.offset) || operation.offset <= 0) {
        throw new RangeError(`Window ${operation.op} offset must be a positive integer.`);
      }
      if (!Object.hasOwn(operation, "default")) {
        throw new TypeError(`Window ${operation.op} requires a default value.`);
      }
    }
    if (MOVING_OPERATIONS.has(operation.op)) {
      validateFrame(operation.frame, operation.op);
      if (!Number.isSafeInteger(operation.minPeriods) || operation.minPeriods <= 0) {
        throw new RangeError(`Window ${operation.op} minPeriods must be a positive safe integer.`);
      }
      if (!["error", "skip"].includes(operation.missing)) {
        throw new Error(`Unsupported window ${operation.op} missing policy "${operation.missing}".`);
      }
    }
  });
}

export function validateWindowTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Window transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "window transform");
  if (transform.type !== "window") {
    throw new Error(`Unsupported window transform "${transform.type}".`);
  }
  validateFieldList(transform.partitionBy, "Window partitionBy");
  validateSortBy(transform.sortBy, "Window");
  validateOperations(transform.operations, transform.sortBy);
  const durationOperations = transform.operations.filter(operation =>
    MOVING_OPERATIONS.has(operation.op) && Object.hasOwn(operation.frame, "duration")
  );
  const hasTemporalUnit = Object.hasOwn(transform, "temporalUnit");
  if (durationOperations.length > 0) {
    validateTemporalUnit(transform.temporalUnit);
    if (transform.sortBy.length !== 1 || transform.sortBy[0].order !== "ascending") {
      throw new Error("Duration windows require exactly one ascending sortBy field.");
    }
  } else if (hasTemporalUnit) {
    throw new Error("Window temporalUnit requires at least one duration operation.");
  }
  return transform;
}

function normalizePartitionBy(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? [...value] : [value];
}

function normalizeOperations(value) {
  if (!Array.isArray(value)) return value;
  return value.map(operation => {
    if (!isPlainObject(operation)) {
      return operation;
    }
    if (OFFSET_OPERATIONS.has(operation.op)) {
      return {
        ...operation,
        offset: operation.offset ?? 1,
        default: Object.hasOwn(operation, "default") ? operation.default : null
      };
    }
    if (MOVING_OPERATIONS.has(operation.op) && isPlainObject(operation.frame)) {
      const duration = isPlainObject(operation.frame.duration)
        ? {
            ...operation.frame.duration,
            following: operation.frame.duration.following ?? 0
          }
        : undefined;
      return {
        ...operation,
        frame: duration === undefined ? {
          ...operation.frame,
          following: operation.frame.following ?? 0
        } : { ...operation.frame, duration },
        minPeriods: operation.minPeriods ?? 1,
        missing: operation.missing ?? "error"
      };
    }
    return operation;
  });
}

export function normalizeWindowTransform({
  partitionBy,
  sortBy,
  operations,
  temporalUnit
} = {}) {
  const transform = {
    type: "window",
    partitionBy: normalizePartitionBy(partitionBy),
    sortBy: normalizeSortBy(sortBy),
    operations: normalizeOperations(operations),
    ...(temporalUnit === undefined ? {} : { temporalUnit })
  };
  validateWindowTransform(transform);
  return cloneAndFreeze(transform);
}

function compareScalar(left, right, label) {
  const leftMissing = left === null || left === undefined;
  const rightMissing = right === null || right === undefined;
  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing ? 1 : -1;
  }
  if (typeof left !== typeof right || !["number", "string", "boolean"].includes(
    typeof left
  )) {
    throw new TypeError(`${label} must contain one comparable primitive type.`);
  }
  if (typeof left === "number" && (!Number.isFinite(left) || !Number.isFinite(right))) {
    throw new TypeError(`${label} must contain finite numbers.`);
  }
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareEntries(left, right, sortBy, stable = true) {
  for (const sort of sortBy) {
    const comparison = compareScalar(
      left.row[sort.field],
      right.row[sort.field],
      `Window sort field "${sort.field}"`
    );
    if (comparison !== 0) {
      return sort.order === "ascending" ? comparison : -comparison;
    }
  }
  return stable ? left.index - right.index : 0;
}

function validateSourceFields(rows, transform) {
  const sourceFields = new Set(rows.flatMap(row => Object.keys(row)));
  for (const field of [...transform.partitionBy, ...transform.sortBy.map(sort => sort.field)]) {
    if (!sourceFields.has(field)) {
      throw new Error(`Window source does not contain field "${field}".`);
    }
    rows.forEach((row, index) => {
      if (!Object.hasOwn(row, field)) {
        throw new Error(`Window source does not contain field "${field}" at row ${index}.`);
      }
    });
  }
  const available = new Set(sourceFields);
  const generated = new Set();
  for (const operation of transform.operations) {
    if (
      !POSITION_OPERATIONS.has(operation.op) &&
      !available.has(operation.field)
    ) {
      throw new Error(`Window source does not contain field "${operation.field}".`);
    }
    if (!POSITION_OPERATIONS.has(operation.op) && !generated.has(operation.field)) {
      rows.forEach((row, index) => {
        if (!Object.hasOwn(row, operation.field)) {
          throw new Error(
            `Window source does not contain field "${operation.field}" at row ${index}.`
          );
        }
      });
    }
    if (available.has(operation.as)) {
      throw new Error(`Window output field "${operation.as}" already exists.`);
    }
    available.add(operation.as);
    generated.add(operation.as);
  }
}

function validatePartitionSortValues(partition, transform) {
  for (const sort of transform.sortBy) {
    const types = new Set(partition.flatMap(({ row }) => {
      const value = row[sort.field];
      if (value === null || value === undefined) return [];
      if (
        !["number", "string", "boolean"].includes(typeof value) ||
        (typeof value === "number" && !Number.isFinite(value))
      ) {
        throw new TypeError(
          `Window sort field "${sort.field}" must contain comparable primitive values.`
        );
      }
      return [typeof value];
    }));
    if (types.size > 1) {
      throw new TypeError(
        `Window sort field "${sort.field}" must contain one comparable primitive type.`
      );
    }
  }
}

function partitionRows(entries, partitionBy) {
  const partitions = new Map();
  for (const entry of entries) {
    const key = partitionBy.length === 0
      ? "all"
      : partitionBy.map(field => scalarKey(
        entry.row[field],
        `Window partition field "${field}"`
      )).join("\0");
    let partition = partitions.get(key);
    if (partition === undefined) {
      partition = [];
      partitions.set(key, partition);
    }
    partition.push(entry);
  }
  return [...partitions.values()];
}

function operationValues(
  partition,
  operation,
  first = 0,
  last = partition.length - 1
) {
  const values = [];
  for (let index = first; index <= last; index += 1) {
    const value = partition[index].row[operation.field];
    if (value === null || value === undefined) {
      if (operation.missing === "skip") continue;
    }
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `Window ${operation.op} field "${operation.field}" must contain finite numbers.`
      );
    }
    values.push(value);
  }
  return values;
}

function validateOperationValues(partition, operation) {
  for (const entry of partition) {
    const value = entry.row[operation.field];
    if ((value === null || value === undefined) && operation.missing === "skip") continue;
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `Window ${operation.op} field "${operation.field}" must contain finite numbers.`
      );
    }
  }
}

function stableWindowOutput(operation, calculate) {
  const label = `Window ${operation.op} output "${operation.as}"`;
  try {
    return calculate(label);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    throw new RangeError(`${label} must be finite.`);
  }
}

function setWindowOutput(entry, field, value) {
  Object.defineProperty(entry.row, field, {
    value, enumerable: true, writable: true, configurable: true
  });
}

function durationMilliseconds(duration, field) {
  const value = duration[field] * DURATION_UNITS[duration.unit];
  if (!Number.isFinite(value)) {
    throw new RangeError(`Window duration ${field} is outside the finite numeric range.`);
  }
  return value;
}

function durationPositions(partition, transform) {
  const field = transform.sortBy[0].field;
  return partition.map((entry, index) => entry.durationTimestamp ??
    normalizeTemporalValue(entry.row[field], field, index, transform.temporalUnit));
}

function validDateBoundary(value) {
  return Number.isFinite(value) && Number.isFinite(new Date(value).getTime());
}

function applyDurationOperation(partition, operation, transform) {
  validateOperationValues(partition, operation);
  const positions = durationPositions(partition, transform);
  const preceding = durationMilliseconds(operation.frame.duration, "preceding");
  const following = durationMilliseconds(operation.frame.duration, "following");
  const rawValues = partition.map(entry => entry.row[operation.field]);
  const finiteValues = rawValues.filter(Number.isFinite);
  const scale = maximumMagnitude(finiteValues) || 1;
  let left = 0;
  let right = 0;
  let total = 0;
  let correction = 0;
  let count = 0;
  let ordinary = 0;
  let ordinaryReliable = true;
  const add = value => {
    if (!Number.isFinite(value)) return;
    if (ordinaryReliable) {
      ordinary += value;
      if (!Number.isFinite(ordinary)) ordinaryReliable = false;
    }
    const scaled = value / scale;
    const next = total + scaled;
    correction += Math.abs(total) >= Math.abs(scaled)
      ? total - next + scaled
      : scaled - next + total;
    total = next;
    count += 1;
  };
  const remove = value => {
    if (!Number.isFinite(value)) return;
    if (ordinaryReliable) ordinary -= value;
    const scaled = -value / scale;
    const next = total + scaled;
    correction += Math.abs(total) >= Math.abs(scaled)
      ? total - next + scaled
      : scaled - next + total;
    total = next;
    count -= 1;
  };
  let index = 0;
  while (index < partition.length) {
    const timestamp = positions[index];
    const lower = timestamp - preceding;
    const upper = timestamp + following;
    if (!validDateBoundary(lower) || !validDateBoundary(upper)) {
      throw new RangeError("Window duration boundary is outside the supported Date range.");
    }
    while (right < partition.length && positions[right] <= upper) {
      add(rawValues[right]);
      right += 1;
    }
    while (left < right && positions[left] < lower) {
      remove(rawValues[left]);
      left += 1;
    }
    let end = index + 1;
    while (end < partition.length && positions[end] === timestamp) end += 1;
    let value = null;
    if (count >= operation.minPeriods) {
      const sum = requireFiniteResult(ordinaryReliable ? ordinary : (total + correction) * scale,
        `Window ${operation.op} output "${operation.as}"`);
      value = operation.op === "movingMean"
        ? requireFiniteResult(sum / count, `Window ${operation.op} output "${operation.as}"`)
        : sum;
    }
    for (let peer = index; peer < end; peer += 1) {
      setWindowOutput(partition[peer], operation.as, value);
    }
    index = end;
  }
}

function applyOperation(partition, operation, sortBy, transform) {
  if (operation.op === "rowNumber") {
    partition.forEach((entry, index) => {
      setWindowOutput(entry, operation.as, index + 1);
    });
    return;
  }
  if (["rank", "denseRank"].includes(operation.op)) {
    let rank = 1;
    let denseRank = 1;
    partition.forEach((entry, index) => {
      if (
        index > 0 &&
        (Object.hasOwn(entry, "durationTimestamp")
          ? entry.durationTimestamp !== partition[index - 1].durationTimestamp
          : compareEntries(entry, partition[index - 1], sortBy, false) !== 0)
      ) {
        rank = index + 1;
        denseRank += 1;
      }
      setWindowOutput(entry, operation.as, operation.op === "rank" ? rank : denseRank);
    });
    return;
  }
  if (operation.op === "cumulativeSum") {
    const values = operationValues(partition, operation);
    const totals = stableWindowOutput(operation, label =>
      stableFinitePrefixSums(values, label)
    );
    partition.forEach((entry, index) => {
      setWindowOutput(entry, operation.as, totals[index]);
    });
    return;
  }
  if (MOVING_OPERATIONS.has(operation.op)) {
    if (Object.hasOwn(operation.frame, "duration")) {
      applyDurationOperation(partition, operation, transform);
      return;
    }
    validateOperationValues(partition, operation);
    const calculate = operation.op === "movingMean"
      ? stableFiniteMean
      : stableFiniteSum;
    partition.forEach((entry, index) => {
      const first = Math.max(0, index - operation.frame.preceding);
      const last = Math.min(
        partition.length - 1,
        index + operation.frame.following
      );
      const values = operationValues(partition, operation, first, last);
      setWindowOutput(entry, operation.as, values.length < operation.minPeriods
        ? null
        : stableWindowOutput(operation, label => calculate(values, label)));
    });
    return;
  }
  const direction = operation.op === "lag" ? -1 : 1;
  partition.forEach((entry, index) => {
    const peer = partition[index + direction * operation.offset];
    setWindowOutput(entry, operation.as, peer === undefined
      ? operation.default
      : peer.row[operation.field]);
  });
}

export function deriveWindowRows(rows, transform) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Window source rows must be an array.");
  }
  if (!rows.every(isPlainObject)) {
    throw new TypeError("Window source rows must be plain objects.");
  }
  validateWindowTransform(transform);
  validateSourceFields(rows, transform);
  const entries = rows.map((row, index) => ({ index, row: { ...row } }));
  const partitions = partitionRows(entries, transform.partitionBy);
  const hasDuration = transform.operations.some(operation =>
    MOVING_OPERATIONS.has(operation.op) && Object.hasOwn(operation.frame, "duration")
  );
  for (const partition of partitions) {
    validatePartitionSortValues(partition, transform);
    if (hasDuration) {
      const field = transform.sortBy[0].field;
      partition.forEach(entry => {
        entry.durationTimestamp = normalizeTemporalValue(
          entry.row[field], field, entry.index, transform.temporalUnit
        );
      });
      partition.sort((left, right) =>
        left.durationTimestamp - right.durationTimestamp || left.index - right.index
      );
    } else {
      partition.sort((left, right) => compareEntries(left, right, transform.sortBy));
    }
  }
  for (const operation of transform.operations) {
    for (const partition of partitions) {
      applyOperation(partition, operation, transform.sortBy, transform);
    }
  }
  return cloneAndFreeze(entries.map(entry => entry.row));
}
