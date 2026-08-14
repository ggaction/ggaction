import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import {
  stableFiniteMean,
  stableFinitePrefixSums,
  stableFiniteSum
} from "./numeric.js";

const TRANSFORM_KEYS = [
  "type", "partitionBy", "sortBy", "operations"
];
const SORT_KEYS = ["field", "order"];
const ORDER_VALUES = ["ascending", "descending"];
const OPERATION_VALUES = [
  "rowNumber", "rank", "denseRank", "cumulativeSum", "lag", "lead",
  "movingMean", "movingSum"
];
const POSITION_OPERATIONS = new Set(OPERATION_VALUES.slice(0, 3));
const OFFSET_OPERATIONS = new Set(OPERATION_VALUES.slice(4, 6));
const MOVING_OPERATIONS = new Set(OPERATION_VALUES.slice(-2));
const FRAME_KEYS = ["preceding", "following"];

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function rejectUnknownKeys(value, supported, label) {
  const unknown = Object.keys(value).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown ${label} property "${unknown}".`);
  }
}

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

function validateSortBy(sortBy) {
  if (!Array.isArray(sortBy)) {
    throw new TypeError("Window sortBy must be an array.");
  }
  const fields = [];
  sortBy.forEach((sort, index) => {
    if (!isPlainObject(sort)) {
      throw new TypeError(`Window sortBy[${index}] must be a plain object.`);
    }
    rejectUnknownKeys(sort, SORT_KEYS, `window sortBy[${index}]`);
    fields.push(requireField(sort.field, `Window sortBy[${index}].field`));
    if (!ORDER_VALUES.includes(sort.order)) {
      throw new Error(`Unsupported window sort order "${sort.order}".`);
    }
  });
  if (new Set(fields).size !== fields.length) {
    throw new Error("Window sortBy fields must be unique.");
  }
}

function operationKeys(operation) {
  if (POSITION_OPERATIONS.has(operation.op)) return ["op", "as"];
  if (operation.op === "cumulativeSum") return ["op", "field", "as"];
  if (OFFSET_OPERATIONS.has(operation.op)) {
    return ["op", "field", "as", "offset", "default"];
  }
  if (MOVING_OPERATIONS.has(operation.op)) {
    return ["op", "field", "as", "frame"];
  }
  return ["op"];
}

function validateFrame(frame, operation) {
  if (!isPlainObject(frame)) {
    throw new TypeError(`Window ${operation} frame must be a plain object.`);
  }
  rejectUnknownKeys(frame, FRAME_KEYS, `window ${operation} frame`);
  for (const field of FRAME_KEYS) {
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
  validateSortBy(transform.sortBy);
  validateOperations(transform.operations, transform.sortBy);
  return transform;
}

function normalizePartitionBy(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? [...value] : [value];
}

function normalizeSortBy(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return value;
  return value.map(sort => isPlainObject(sort)
    ? { field: sort.field, order: sort.order ?? "ascending" }
    : sort
  );
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
      return {
        ...operation,
        frame: {
          ...operation.frame,
          following: operation.frame.following ?? 0
        }
      };
    }
    return operation;
  });
}

export function normalizeWindowTransform({
  partitionBy,
  sortBy,
  operations
} = {}) {
  const transform = {
    type: "window",
    partitionBy: normalizePartitionBy(partitionBy),
    sortBy: normalizeSortBy(sortBy),
    operations: normalizeOperations(operations)
  };
  validateWindowTransform(transform);
  return cloneAndFreeze(transform);
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
  }
  const available = new Set(sourceFields);
  for (const operation of transform.operations) {
    if (
      !POSITION_OPERATIONS.has(operation.op) &&
      !available.has(operation.field)
    ) {
      throw new Error(`Window source does not contain field "${operation.field}".`);
    }
    if (available.has(operation.as)) {
      throw new Error(`Window output field "${operation.as}" already exists.`);
    }
    available.add(operation.as);
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
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `Window ${operation.op} field "${operation.field}" must contain finite numbers.`
      );
    }
    values.push(value);
  }
  return values;
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

function applyOperation(partition, operation, sortBy) {
  if (operation.op === "rowNumber") {
    partition.forEach((entry, index) => {
      entry.row[operation.as] = index + 1;
    });
    return;
  }
  if (["rank", "denseRank"].includes(operation.op)) {
    let rank = 1;
    let denseRank = 1;
    partition.forEach((entry, index) => {
      if (
        index > 0 &&
        compareEntries(entry, partition[index - 1], sortBy, false) !== 0
      ) {
        rank = index + 1;
        denseRank += 1;
      }
      entry.row[operation.as] = operation.op === "rank" ? rank : denseRank;
    });
    return;
  }
  if (operation.op === "cumulativeSum") {
    const values = operationValues(partition, operation);
    const totals = stableWindowOutput(operation, label =>
      stableFinitePrefixSums(values, label)
    );
    partition.forEach((entry, index) => {
      entry.row[operation.as] = totals[index];
    });
    return;
  }
  if (MOVING_OPERATIONS.has(operation.op)) {
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
      entry.row[operation.as] = stableWindowOutput(operation, label =>
        calculate(values, label)
      );
    });
    return;
  }
  const direction = operation.op === "lag" ? -1 : 1;
  partition.forEach((entry, index) => {
    const peer = partition[index + direction * operation.offset];
    entry.row[operation.as] = peer === undefined
      ? operation.default
      : peer.row[operation.field];
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
  for (const partition of partitions) {
    validatePartitionSortValues(partition, transform);
    partition.sort((left, right) => compareEntries(left, right, transform.sortBy));
  }
  for (const operation of transform.operations) {
    for (const partition of partitions) {
      applyOperation(partition, operation, transform.sortBy);
    }
  }
  return cloneAndFreeze(entries.map(entry => entry.row));
}
