function assertRows(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Window rows must be an array.");
  }
  for (const [index, row] of rows.entries()) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError(`Window row ${index} must be a plain object.`);
    }
  }
}

function normalizeFields(value, label) {
  if (value === undefined) return [];
  const fields = typeof value === "string" ? [value] : value;
  if (!Array.isArray(fields) || fields.some(field =>
    typeof field !== "string" || field.length === 0
  )) {
    throw new TypeError(`${label} must be a field string or an array of field strings.`);
  }
  if (new Set(fields).size !== fields.length) {
    throw new Error(`${label} fields must be unique.`);
  }
  return [...fields];
}

function normalizeSort(sortBy) {
  if (sortBy === undefined) return [];
  if (!Array.isArray(sortBy)) {
    throw new TypeError("Window sortBy must be an array.");
  }
  return sortBy.map((sort, index) => {
    if (sort === null || typeof sort !== "object" || Array.isArray(sort)) {
      throw new TypeError(`Window sortBy[${index}] must be an object.`);
    }
    if (typeof sort.field !== "string" || sort.field.length === 0) {
      throw new TypeError(`Window sortBy[${index}].field must be a non-empty string.`);
    }
    const order = sort.order ?? "ascending";
    if (!["ascending", "descending"].includes(order)) {
      throw new Error(`Window sortBy[${index}] has unsupported order "${order}".`);
    }
    return Object.freeze({ field: sort.field, order });
  });
}

function scalarKey(value, label) {
  if (value === null) return "null";
  if (typeof value === "string") return `string:${value.length}:${value}`;
  if (typeof value === "boolean") return `boolean:${value}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `number:${Object.is(value, -0) ? 0 : value}`;
  }
  throw new TypeError(`${label} must be null, a string, a boolean, or a finite number.`);
}

function compareScalar(left, right, label) {
  if (left === null || left === undefined) {
    return right === null || right === undefined ? 0 : 1;
  }
  if (right === null || right === undefined) return -1;
  const leftType = typeof left;
  const rightType = typeof right;
  if (leftType !== rightType || !["number", "string", "boolean"].includes(leftType)) {
    throw new TypeError(`${label} values must have one comparable primitive type.`);
  }
  if (leftType === "number" && (!Number.isFinite(left) || !Number.isFinite(right))) {
    throw new TypeError(`${label} values must be finite.`);
  }
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareEntries(left, right, sortBy) {
  for (const sort of sortBy) {
    const comparison = compareScalar(
      left.row[sort.field],
      right.row[sort.field],
      `Window sort field "${sort.field}"`
    );
    if (comparison !== 0) return sort.order === "ascending" ? comparison : -comparison;
  }
  return left.index - right.index;
}

function sameSortKey(left, right, sortBy) {
  return sortBy.every(sort => compareScalar(
    left.row[sort.field],
    right.row[sort.field],
    `Window sort field "${sort.field}"`
  ) === 0);
}

function normalizeOperations(operations, rows, sortBy) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new TypeError("Window operations must be a non-empty array.");
  }
  const fields = new Set(rows.flatMap(row => Object.keys(row)));
  return operations.map((operation, index) => {
    if (operation === null || typeof operation !== "object" || Array.isArray(operation)) {
      throw new TypeError(`Window operation ${index} must be an object.`);
    }
    const supported = ["rowNumber", "rank", "denseRank", "cumulativeSum", "lag", "lead"];
    if (!supported.includes(operation.op)) {
      throw new Error(`Unsupported window operation "${operation.op}".`);
    }
    if (typeof operation.as !== "string" || operation.as.length === 0) {
      throw new TypeError(`Window operation ${index} requires a non-empty as field.`);
    }
    if (fields.has(operation.as)) {
      throw new Error(`Window output field "${operation.as}" already exists.`);
    }
    if (["rank", "denseRank"].includes(operation.op) && sortBy.length === 0) {
      throw new Error(`${operation.op} requires a non-empty sortBy.`);
    }
    if (["cumulativeSum", "lag", "lead"].includes(operation.op) && (
      typeof operation.field !== "string" || operation.field.length === 0
    )) {
      throw new TypeError(`${operation.op} requires a non-empty field.`);
    }
    const offset = operation.offset ?? 1;
    if (["lag", "lead"].includes(operation.op) && (!Number.isInteger(offset) || offset <= 0)) {
      throw new RangeError(`${operation.op} offset must be a positive integer.`);
    }
    fields.add(operation.as);
    return Object.freeze({
      ...operation,
      ...(["lag", "lead"].includes(operation.op) ? {
        offset,
        default: Object.hasOwn(operation, "default") ? operation.default : null
      } : {})
    });
  });
}

function partitionEntries(entries, partitionBy) {
  const partitions = new Map();
  for (const entry of entries) {
    const key = partitionBy.length === 0
      ? "all"
      : partitionBy.map(field => scalarKey(
        entry.row[field],
        `Window partition field "${field}"`
      )).join("\0");
    if (!partitions.has(key)) partitions.set(key, []);
    partitions.get(key).push(entry);
  }
  return [...partitions.values()];
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
      if (index > 0 && !sameSortKey(entry, partition[index - 1], sortBy)) {
        rank = index + 1;
        denseRank += 1;
      }
      entry.row[operation.as] = operation.op === "rank" ? rank : denseRank;
    });
    return;
  }
  if (operation.op === "cumulativeSum") {
    let total = 0;
    for (const entry of partition) {
      const value = entry.row[operation.field];
      if (!Number.isFinite(value)) {
        throw new TypeError(
          `cumulativeSum field "${operation.field}" must contain finite numbers.`
        );
      }
      total += value;
      entry.row[operation.as] = total;
    }
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

export function createWindowReference(rows, options = {}) {
  assertRows(rows);
  const partitionBy = normalizeFields(options.partitionBy, "Window partitionBy");
  const sortBy = normalizeSort(options.sortBy);
  const output = rows.map((row, index) => ({ index, row: { ...row } }));
  const operations = normalizeOperations(options.operations, rows, sortBy);
  const partitions = partitionEntries(output, partitionBy).map(partition =>
    [...partition].sort((left, right) => compareEntries(left, right, sortBy))
  );
  for (const operation of operations) {
    for (const partition of partitions) applyOperation(partition, operation, sortBy);
  }
  return Object.freeze(output
    .sort((left, right) => left.index - right.index)
    .map(entry => Object.freeze(entry.row)));
}
