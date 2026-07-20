function assertRows(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("2D bin rows must be an array.");
  }
}

function assertField(field, label) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return field;
}

function normalizeBins(bins = 10) {
  const normalized = Number.isInteger(bins) ? { x: bins, y: bins } : bins;
  if (
    normalized === null ||
    typeof normalized !== "object" ||
    Array.isArray(normalized) ||
    !Number.isInteger(normalized.x) ||
    normalized.x <= 0 ||
    !Number.isInteger(normalized.y) ||
    normalized.y <= 0
  ) {
    throw new RangeError("2D bin bins must be a positive integer or positive x/y integers.");
  }
  return Object.freeze({ x: normalized.x, y: normalized.y });
}

function normalizeRequestedExtent(extent) {
  if (extent === undefined) return {};
  if (extent === null || typeof extent !== "object" || Array.isArray(extent)) {
    throw new TypeError("2D bin extent must be an object.");
  }
  const normalized = {};
  for (const axis of ["x", "y"]) {
    if (extent[axis] === undefined) continue;
    const value = extent[axis];
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      !value.every(Number.isFinite) ||
      value[0] >= value[1]
    ) {
      throw new RangeError(`2D bin ${axis} extent must be two increasing finite numbers.`);
    }
    normalized[axis] = Object.freeze([...value]);
  }
  return normalized;
}

function resolveExtent(values, requested, axis) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const extent = requested ?? [minimum, maximum];
  if (extent[0] > minimum || extent[1] < maximum) {
    throw new RangeError(`2D bin ${axis} extent must contain every eligible value.`);
  }
  if (extent[0] === extent[1]) {
    throw new RangeError(`2D bin ${axis} extent must have positive span.`);
  }
  return Object.freeze([...extent]);
}

function createEdges(extent, count) {
  const [minimum, maximum] = extent;
  const step = (maximum - minimum) / count;
  return Object.freeze(Array.from({ length: count + 1 }, (_, index) =>
    index === count ? maximum : minimum + step * index
  ));
}

function binIndex(value, extent, count) {
  if (value === extent[1]) return count - 1;
  return Math.floor(((value - extent[0]) / (extent[1] - extent[0])) * count);
}

function normalizeFields(id, as, members) {
  assertField(id, "2D bin id");
  if (as !== undefined && (as === null || typeof as !== "object" || Array.isArray(as))) {
    throw new TypeError("2D bin as must be an object.");
  }
  const fields = {
    x0: as?.x0 ?? `__${id}_x0`,
    x1: as?.x1 ?? `__${id}_x1`,
    y0: as?.y0 ?? `__${id}_y0`,
    y1: as?.y1 ?? `__${id}_y1`,
    count: as?.count ?? `__${id}_count`,
    ...(members ? { members: as?.members ?? `__${id}_members` } : {})
  };
  for (const [role, field] of Object.entries(fields)) {
    assertField(field, `2D bin ${role} output field`);
  }
  if (new Set(Object.values(fields)).size !== Object.values(fields).length) {
    throw new Error("2D bin output fields must be unique.");
  }
  return Object.freeze(fields);
}

export function createBin2DReference(rows, options = {}) {
  assertRows(rows);
  const id = assertField(options.id, "2D bin id");
  const x = assertField(options.x, "2D bin x field");
  const y = assertField(options.y, "2D bin y field");
  const bins = normalizeBins(options.bins);
  const requestedExtent = normalizeRequestedExtent(options.extent);
  const includeEmpty = options.includeEmpty ?? false;
  const members = options.members ?? false;
  if (typeof includeEmpty !== "boolean" || typeof members !== "boolean") {
    throw new TypeError("2D bin includeEmpty and members must be boolean.");
  }
  const fields = normalizeFields(id, options.as, members);
  const eligible = rows.map((row, index) => ({ index, row })).filter(({ row }) =>
    row !== null && typeof row === "object" &&
    Number.isFinite(row[x]) && Number.isFinite(row[y])
  );
  if (eligible.length === 0) {
    throw new Error("2D bin requires at least one row with finite x and y values.");
  }
  const extent = Object.freeze({
    x: resolveExtent(eligible.map(item => item.row[x]), requestedExtent.x, "x"),
    y: resolveExtent(eligible.map(item => item.row[y]), requestedExtent.y, "y")
  });
  const edges = Object.freeze({
    x: createEdges(extent.x, bins.x),
    y: createEdges(extent.y, bins.y)
  });
  const buckets = Array.from({ length: bins.x * bins.y }, () => []);
  for (const item of eligible) {
    const xIndex = binIndex(item.row[x], extent.x, bins.x);
    const yIndex = binIndex(item.row[y], extent.y, bins.y);
    buckets[yIndex * bins.x + xIndex].push(item.index);
  }
  const output = [];
  for (let yIndex = 0; yIndex < bins.y; yIndex += 1) {
    for (let xIndex = 0; xIndex < bins.x; xIndex += 1) {
      const bucket = buckets[yIndex * bins.x + xIndex];
      if (!includeEmpty && bucket.length === 0) continue;
      output.push(Object.freeze({
        [fields.x0]: edges.x[xIndex],
        [fields.x1]: edges.x[xIndex + 1],
        [fields.y0]: edges.y[yIndex],
        [fields.y1]: edges.y[yIndex + 1],
        [fields.count]: bucket.length,
        ...(members ? { [fields.members]: Object.freeze([...bucket]) } : {})
      }));
    }
  }
  return Object.freeze({
    rows: Object.freeze(output),
    fields,
    bins,
    extent,
    edges,
    eligibleCount: eligible.length,
    occupiedCount: buckets.filter(bucket => bucket.length > 0).length
  });
}
