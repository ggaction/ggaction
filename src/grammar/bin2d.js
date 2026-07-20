import {
  cloneAndFreeze,
  isPlainObject
} from "../core/immutable.js";

const TRANSFORM_KEYS = Object.freeze([
  "type", "x", "y", "bins", "extent", "includeEmpty", "members", "as",
  "resolved"
]);
const BIN_KEYS = Object.freeze(["x", "y"]);
const EXTENT_KEYS = Object.freeze(["x", "y"]);
const FIELD_KEYS = Object.freeze(["x0", "x1", "y0", "y1", "count", "members"]);
const RESOLVED_KEYS = Object.freeze([
  "extent", "edges", "eligibleCount", "occupiedCount"
]);

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

function requirePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
  return value;
}

function normalizeBins(value) {
  if (value === undefined) return { x: 10, y: 10 };
  if (Number.isInteger(value)) return { x: value, y: value };
  if (!isPlainObject(value)) {
    throw new TypeError(
      "2D bin bins must be a positive integer or an object with x and y."
    );
  }
  rejectUnknownKeys(value, BIN_KEYS, "2D bin bins");
  return { x: value.x, y: value.y };
}

function validateBins(value) {
  if (!isPlainObject(value)) {
    throw new TypeError("2D bin bins must be an object.");
  }
  rejectUnknownKeys(value, BIN_KEYS, "2D bin bins");
  requirePositiveInteger(value.x, "2D bin x bins");
  requirePositiveInteger(value.y, "2D bin y bins");
}

function normalizeRequestedExtent(value) {
  if (value === undefined) return { x: "auto", y: "auto" };
  if (!isPlainObject(value)) {
    throw new TypeError("2D bin extent must be an object.");
  }
  rejectUnknownKeys(value, EXTENT_KEYS, "2D bin extent");
  return {
    x: value.x ?? "auto",
    y: value.y ?? "auto"
  };
}

function validateExtentValue(value, label, { allowAuto = true } = {}) {
  if (allowAuto && value === "auto") return;
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every(Number.isFinite) ||
    value[0] >= value[1]
  ) {
    throw new RangeError(`${label} must be two increasing finite numbers.`);
  }
}

function validateRequestedExtent(value) {
  if (!isPlainObject(value)) {
    throw new TypeError("2D bin extent must be an object.");
  }
  rejectUnknownKeys(value, EXTENT_KEYS, "2D bin extent");
  validateExtentValue(value.x, "2D bin x extent");
  validateExtentValue(value.y, "2D bin y extent");
}

function normalizeOutputFields(id, value, members) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError("2D bin as must be an object.");
  }
  if (value !== undefined) rejectUnknownKeys(value, FIELD_KEYS, "2D bin as");
  if (!members && value?.members !== undefined) {
    throw new Error("2D bin as.members requires members: true.");
  }
  return {
    x0: value?.x0 ?? `__${id}_x0`,
    x1: value?.x1 ?? `__${id}_x1`,
    y0: value?.y0 ?? `__${id}_y0`,
    y1: value?.y1 ?? `__${id}_y1`,
    count: value?.count ?? `__${id}_count`,
    ...(members ? { members: value?.members ?? `__${id}_members` } : {})
  };
}

function validateOutputFields(value, members) {
  if (!isPlainObject(value)) {
    throw new TypeError("2D bin as must be an object.");
  }
  rejectUnknownKeys(value, FIELD_KEYS, "2D bin as");
  const required = ["x0", "x1", "y0", "y1", "count"];
  if (members) required.push("members");
  if (!members && value.members !== undefined) {
    throw new Error("2D bin as.members requires members: true.");
  }
  const fields = required.map(role => requireField(
    value[role],
    `2D bin ${role} output field`
  ));
  if (new Set(fields).size !== fields.length) {
    throw new Error("2D bin output fields must be unique.");
  }
}

function validateEdges(value, extent, count, axis) {
  if (
    !Array.isArray(value) ||
    value.length !== count + 1 ||
    !value.every(Number.isFinite)
  ) {
    throw new TypeError(`Resolved 2D bin ${axis} edges are invalid.`);
  }
  if (value[0] !== extent[0] || value.at(-1) !== extent[1]) {
    throw new Error(`Resolved 2D bin ${axis} edges must match its extent.`);
  }
  for (let index = 1; index < value.length; index += 1) {
    if (value[index] <= value[index - 1]) {
      throw new Error(`Resolved 2D bin ${axis} edges must be increasing.`);
    }
  }
}

function validateResolved(value, bins) {
  if (!isPlainObject(value)) {
    throw new TypeError("Resolved 2D bin state must be a plain object.");
  }
  rejectUnknownKeys(value, RESOLVED_KEYS, "resolved 2D bin");
  if (!isPlainObject(value.extent) || !isPlainObject(value.edges)) {
    throw new TypeError("Resolved 2D bin extent and edges must be objects.");
  }
  rejectUnknownKeys(value.extent, EXTENT_KEYS, "resolved 2D bin extent");
  rejectUnknownKeys(value.edges, EXTENT_KEYS, "resolved 2D bin edges");
  for (const axis of ["x", "y"]) {
    validateExtentValue(
      value.extent[axis],
      `Resolved 2D bin ${axis} extent`,
      { allowAuto: false }
    );
    validateEdges(value.edges[axis], value.extent[axis], bins[axis], axis);
  }
  for (const property of ["eligibleCount", "occupiedCount"]) {
    if (!Number.isInteger(value[property]) || value[property] < 0) {
      throw new RangeError(`Resolved 2D bin ${property} must be a non-negative integer.`);
    }
  }
  if (value.occupiedCount > bins.x * bins.y) {
    throw new RangeError("Resolved 2D bin occupiedCount exceeds the grid size.");
  }
}

export function validateBin2DTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("2D bin transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "2D bin transform");
  if (transform.type !== "bin2d") {
    throw new Error(`Unsupported 2D bin transform "${transform.type}".`);
  }
  requireField(transform.x, "2D bin x field");
  requireField(transform.y, "2D bin y field");
  validateBins(transform.bins);
  validateRequestedExtent(transform.extent);
  if (typeof transform.includeEmpty !== "boolean") {
    throw new TypeError("2D bin includeEmpty must be a boolean.");
  }
  if (typeof transform.members !== "boolean") {
    throw new TypeError("2D bin members must be a boolean.");
  }
  validateOutputFields(transform.as, transform.members);
  if (transform.resolved !== undefined) {
    validateResolved(transform.resolved, transform.bins);
  }
  return transform;
}

export function normalizeBin2DTransform({
  id,
  x,
  y,
  bins,
  extent,
  includeEmpty = false,
  members = false,
  as
} = {}) {
  const normalizedBins = normalizeBins(bins);
  const transform = {
    type: "bin2d",
    x,
    y,
    bins: normalizedBins,
    extent: normalizeRequestedExtent(extent),
    includeEmpty,
    members,
    as: normalizeOutputFields(id, as, members)
  };
  validateBin2DTransform(transform);
  return cloneAndFreeze(transform);
}

function resolveExtent(values, requested, axis) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const extent = requested === "auto" ? [minimum, maximum] : requested;
  if (extent[0] > minimum || extent[1] < maximum) {
    throw new RangeError(
      `2D bin ${axis} extent must contain every eligible value.`
    );
  }
  if (extent[0] === extent[1]) {
    throw new RangeError(`2D bin ${axis} extent must have positive span.`);
  }
  return [...extent];
}

function createEdges(extent, count) {
  const [minimum, maximum] = extent;
  const step = (maximum - minimum) / count;
  return Array.from({ length: count + 1 }, (_, index) =>
    index === count ? maximum : minimum + step * index
  );
}

function findBinIndex(value, edges) {
  if (value === edges.at(-1)) return edges.length - 2;
  let low = 0;
  let high = edges.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (value < edges[middle]) high = middle;
    else low = middle;
  }
  return low;
}

export function deriveBin2DRows(rows, transform) {
  if (!Array.isArray(rows)) {
    throw new TypeError("2D bin source rows must be an array.");
  }
  validateBin2DTransform(transform);
  const eligible = rows.flatMap((row, index) =>
    isPlainObject(row) &&
    Number.isFinite(row[transform.x]) &&
    Number.isFinite(row[transform.y])
      ? [{ index, row }]
      : []
  );
  if (eligible.length === 0) {
    throw new Error(
      "2D bin requires at least one row with finite x and y values."
    );
  }
  const extent = {
    x: resolveExtent(
      eligible.map(item => item.row[transform.x]),
      transform.extent.x,
      "x"
    ),
    y: resolveExtent(
      eligible.map(item => item.row[transform.y]),
      transform.extent.y,
      "y"
    )
  };
  const edges = {
    x: createEdges(extent.x, transform.bins.x),
    y: createEdges(extent.y, transform.bins.y)
  };
  const buckets = Array.from(
    { length: transform.bins.x * transform.bins.y },
    () => []
  );
  for (const item of eligible) {
    const xIndex = findBinIndex(item.row[transform.x], edges.x);
    const yIndex = findBinIndex(item.row[transform.y], edges.y);
    buckets[yIndex * transform.bins.x + xIndex].push(item.index);
  }
  const values = [];
  for (let yIndex = 0; yIndex < transform.bins.y; yIndex += 1) {
    for (let xIndex = 0; xIndex < transform.bins.x; xIndex += 1) {
      const memberIndexes = buckets[yIndex * transform.bins.x + xIndex];
      if (!transform.includeEmpty && memberIndexes.length === 0) continue;
      values.push({
        [transform.as.x0]: edges.x[xIndex],
        [transform.as.x1]: edges.x[xIndex + 1],
        [transform.as.y0]: edges.y[yIndex],
        [transform.as.y1]: edges.y[yIndex + 1],
        [transform.as.count]: memberIndexes.length,
        ...(transform.members
          ? { [transform.as.members]: [...memberIndexes] }
          : {})
      });
    }
  }
  return cloneAndFreeze({
    values,
    resolved: {
      extent,
      edges,
      eligibleCount: eligible.length,
      occupiedCount: buckets.filter(bucket => bucket.length > 0).length
    }
  });
}

export function requestedBin2DTransform(transform) {
  const { resolved: _resolved, ...requested } = transform;
  return cloneAndFreeze(requested);
}
