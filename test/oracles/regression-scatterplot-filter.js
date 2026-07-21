function comparable(value, operand) {
  return (
    Number.isFinite(value) && Number.isFinite(operand)
  ) || (
    typeof value === "string" && typeof operand === "string"
  );
}

function matchesFilter(value, filter) {
  if (filter.oneOf !== undefined) return filter.oneOf.includes(value);
  if (filter.predicate !== undefined) {
    const { op, value: operand } = filter.predicate;
    if (op === "eq") return value === operand;
    if (op === "neq") return value !== operand;
    if (!comparable(value, operand)) return false;
    if (op === "lt") return value < operand;
    if (op === "lte") return value <= operand;
    if (op === "gt") return value > operand;
    if (op === "gte") return value >= operand;
    throw new Error(`Unsupported reference filter operator "${op}".`);
  }
  const { min, max, inclusive = true } = filter.range;
  if (!comparable(value, min) || !comparable(value, max)) return false;
  return inclusive
    ? value >= min && value <= max
    : value > min && value < max;
}

function validateReferenceFilter(filter) {
  if (filter === null || typeof filter !== "object" || Array.isArray(filter)) {
    throw new TypeError("Reference filter must be an object.");
  }
  if (typeof filter.field !== "string" || filter.field.length === 0) {
    throw new TypeError("Reference filter field must be a non-empty string.");
  }
  const modes = ["oneOf", "predicate", "range"].filter(
    mode => Object.hasOwn(filter, mode)
  );
  if (modes.length !== 1) {
    throw new Error("Reference filter requires exactly one filter mode.");
  }
  if (
    modes[0] === "oneOf" &&
    (!Array.isArray(filter.oneOf) || filter.oneOf.length === 0)
  ) {
    throw new TypeError("Reference filter oneOf must be a non-empty array.");
  }
  if (modes[0] === "predicate") {
    const predicate = filter.predicate;
    if (
      predicate === null ||
      typeof predicate !== "object" ||
      Array.isArray(predicate) ||
      !["eq", "neq", "lt", "lte", "gt", "gte"].includes(predicate.op)
    ) {
      throw new TypeError("Reference filter predicate is invalid.");
    }
    if (
      !["eq", "neq"].includes(predicate.op) &&
      typeof predicate.value !== "string" &&
      !Number.isFinite(predicate.value)
    ) {
      throw new TypeError("Reference ordered filter value is invalid.");
    }
  }
  if (modes[0] === "range") {
    const range = filter.range;
    if (
      range === null ||
      typeof range !== "object" ||
      Array.isArray(range) ||
      (typeof range.min !== "string" && !Number.isFinite(range.min)) ||
      typeof range.min !== typeof range.max ||
      range.min > range.max ||
      (range.inclusive !== undefined && typeof range.inclusive !== "boolean")
    ) {
      throw new TypeError("Reference filter range is invalid.");
    }
  }
}

export function selectRegressionFilterRows(rows, filter) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Cars must be an array.");
  }
  validateReferenceFilter(filter);
  return rows
    .filter(row =>
      row !== null &&
      typeof row === "object" &&
      matchesFilter(row[filter.field], filter)
    )
    .map(row => structuredClone(row));
}
