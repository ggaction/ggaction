import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import {
  inverseLerp,
  numericExtent,
  requireFiniteResult,
  stableFiniteDeviation,
  stableFiniteSum
} from "./numeric.js";

const TRANSFORM_KEYS = Object.freeze([
  "type", "field", "as", "groupBy", "method", "variance",
  "zeroDenominator", "baseline", "sortBy"
]);
const METHODS = Object.freeze([
  "share", "zscore", "minmax", "index", "change", "percentChange"
]);
const ZERO_POLICIES = Object.freeze(["error", "null", "zero"]);
const SORT_KEYS = Object.freeze(["field", "order"]);
const ORDERS = Object.freeze(["ascending", "descending"]);
const BASELINE_KEYS = Object.freeze(["position", "value"]);
const BASELINE_METHODS = new Set(["index", "change", "percentChange"]);

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

function normalizeGroupBy(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? [...value] : [value];
}

function validateGroupBy(groupBy) {
  if (!Array.isArray(groupBy) || groupBy.some(field =>
    typeof field !== "string" || field.length === 0
  )) {
    throw new TypeError("Normalize groupBy must contain field names.");
  }
  if (new Set(groupBy).size !== groupBy.length) {
    throw new Error("Normalize groupBy fields must be unique.");
  }
}

function normalizeSortBy(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return value;
  return value.map(sort => isPlainObject(sort)
    ? { ...sort, order: sort.order ?? "ascending" }
    : sort
  );
}

function validateSortBy(sortBy) {
  if (!Array.isArray(sortBy)) throw new TypeError("Normalize sortBy must be an array.");
  const fields = [];
  sortBy.forEach((sort, index) => {
    if (!isPlainObject(sort)) {
      throw new TypeError(`Normalize sortBy[${index}] must be a plain object.`);
    }
    rejectUnknownKeys(sort, SORT_KEYS, `normalize sortBy[${index}]`);
    fields.push(requireField(sort.field, `Normalize sortBy[${index}].field`));
    if (!ORDERS.includes(sort.order)) {
      throw new Error(`Unsupported normalize sort order "${sort.order}".`);
    }
  });
  if (new Set(fields).size !== fields.length) {
    throw new Error("Normalize sortBy fields must be unique.");
  }
}

function normalizeBaseline(value) {
  if (!isPlainObject(value)) return value;
  return { ...value };
}

function validateBaseline(baseline, sortBy) {
  if (!isPlainObject(baseline)) {
    throw new TypeError("Normalize baseline must be a plain object.");
  }
  rejectUnknownKeys(baseline, BASELINE_KEYS, "normalize baseline");
  const modes = BASELINE_KEYS.filter(key => Object.hasOwn(baseline, key));
  if (modes.length !== 1) {
    throw new Error("Normalize baseline requires exactly one of position or value.");
  }
  if (modes[0] === "value") {
    if (!Number.isFinite(baseline.value)) {
      throw new TypeError("Normalize baseline value must be finite.");
    }
  } else {
    if (!["first", "last"].includes(baseline.position)) {
      throw new Error("Normalize baseline position must be first or last.");
    }
    if (sortBy.length === 0) {
      throw new Error("Normalize baseline position requires non-empty sortBy.");
    }
  }
}

export function validateNormalizeTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Normalize transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "normalize transform");
  if (transform.type !== "normalize") {
    throw new Error(`Unsupported normalize transform "${transform.type}".`);
  }
  requireField(transform.field, "Normalize field");
  requireField(transform.as, "Normalize output field");
  validateGroupBy(transform.groupBy);
  if (!METHODS.includes(transform.method)) {
    throw new Error(`Unsupported normalize method "${transform.method}".`);
  }

  const hasVariance = Object.hasOwn(transform, "variance");
  const hasZero = Object.hasOwn(transform, "zeroDenominator");
  const hasBaseline = Object.hasOwn(transform, "baseline");
  const hasSort = Object.hasOwn(transform, "sortBy");
  if (transform.method === "zscore") {
    if (!["population", "sample"].includes(transform.variance)) {
      throw new Error("Normalize zscore variance must be population or sample.");
    }
  } else if (hasVariance) {
    throw new Error(`Normalize variance is not available for ${transform.method}.`);
  }
  if (hasZero && !ZERO_POLICIES.includes(transform.zeroDenominator)) {
    throw new Error(`Unsupported normalize zeroDenominator "${transform.zeroDenominator}".`);
  }
  if (transform.method === "change" && hasZero) {
    throw new Error("Normalize zeroDenominator is not available for change.");
  }
  if (BASELINE_METHODS.has(transform.method)) {
    validateSortBy(transform.sortBy);
    validateBaseline(transform.baseline, transform.sortBy);
  } else {
    if (hasBaseline) {
      throw new Error(`Normalize baseline is not available for ${transform.method}.`);
    }
    if (hasSort) {
      throw new Error(`Normalize sortBy is not available for ${transform.method}.`);
    }
  }
  return transform;
}

export function normalizeNormalizeTransform(args = {}) {
  const {
    field,
    as,
    groupBy,
    method,
    variance,
    zeroDenominator,
    baseline,
    sortBy
  } = args;
  const transform = {
    type: "normalize",
    field,
    as,
    groupBy: normalizeGroupBy(groupBy),
    method
  };
  if (method === "zscore") transform.variance = variance ?? "population";
  else if (Object.hasOwn(args, "variance")) transform.variance = variance;
  if (method !== "change") transform.zeroDenominator = zeroDenominator ?? "error";
  else if (Object.hasOwn(args, "zeroDenominator")) {
    transform.zeroDenominator = zeroDenominator;
  }
  if (BASELINE_METHODS.has(method)) {
    transform.baseline = normalizeBaseline(baseline ?? { position: "first" });
    transform.sortBy = normalizeSortBy(sortBy);
  } else {
    if (Object.hasOwn(args, "baseline")) transform.baseline = normalizeBaseline(baseline);
    if (Object.hasOwn(args, "sortBy")) transform.sortBy = normalizeSortBy(sortBy);
  }
  validateNormalizeTransform(transform);
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
  if (typeof left !== typeof right ||
    !["number", "string", "boolean"].includes(typeof left) ||
    typeof left === "number" && (!Number.isFinite(left) || !Number.isFinite(right))) {
    throw new TypeError(`${label} must contain one comparable primitive type.`);
  }
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareEntries(left, right, sortBy) {
  for (const sort of sortBy) {
    const comparison = compareScalar(
      left.row[sort.field],
      right.row[sort.field],
      `Normalize sort field "${sort.field}"`
    );
    if (comparison !== 0) return sort.order === "ascending" ? comparison : -comparison;
  }
  return left.index - right.index;
}

function validateRows(rows, transform) {
  if (!Array.isArray(rows) || !rows.every(isPlainObject)) {
    throw new TypeError("Normalize source rows must be plain objects.");
  }
  if (rows.length === 0) return;
  const fields = [
    transform.field,
    ...transform.groupBy,
    ...(transform.sortBy ?? []).map(sort => sort.field)
  ];
  rows.forEach((row, index) => {
    if (Object.hasOwn(row, transform.as)) {
      throw new Error(`Normalize output field "${transform.as}" already exists.`);
    }
    for (const field of fields) {
      if (!Object.hasOwn(row, field)) {
        throw new Error(`Normalize source does not contain field "${field}" at row ${index}.`);
      }
    }
    if (!Number.isFinite(row[transform.field])) {
      throw new TypeError(
        `Normalize field "${transform.field}" must contain finite numbers at row ${index}.`
      );
    }
    for (const field of transform.groupBy) {
      scalarKey(row[field], `Normalize group field "${field}"`);
    }
    for (const sort of transform.sortBy ?? []) {
      compareScalar(
        row[sort.field],
        row[sort.field],
        `Normalize sort field "${sort.field}"`
      );
    }
  });
}

function groupRows(rows, transform) {
  const groups = new Map();
  rows.forEach((row, index) => {
    const key = transform.groupBy.length === 0
      ? "all"
      : transform.groupBy.map(field =>
        scalarKey(row[field], `Normalize group field "${field}"`)
      ).join("\0");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ row, index });
  });
  return [...groups.values()];
}

function zeroResult(policy, method) {
  if (policy === "null") return null;
  if (policy === "zero") return 0;
  throw new RangeError(`Normalize ${method} denominator is zero.`);
}

function finiteOutput(value, method) {
  return requireFiniteResult(value, `Normalize ${method} output`);
}

function zscore(value, mean, deviation, method) {
  const difference = value - mean;
  return finiteOutput(
    Number.isFinite(difference) ? difference / deviation : value / deviation - mean / deviation,
    method
  );
}

function applyGroup(group, transform, outputs) {
  const values = group.map(entry => entry.row[transform.field]);
  if (transform.method === "share" && values.some(value => value < 0)) {
    throw new RangeError("Normalize share does not accept negative values.");
  }
  if (transform.method === "share") {
    const total = stableFiniteSum(values, "Normalize share sum");
    group.forEach((entry, index) => {
      outputs[entry.index] = total === 0
        ? zeroResult(transform.zeroDenominator, transform.method)
        : finiteOutput(values[index] / total, transform.method);
    });
    return;
  }
  if (transform.method === "minmax") {
    const [minimum, maximum] = numericExtent(values);
    group.forEach((entry, index) => {
      outputs[entry.index] = minimum === maximum
        ? zeroResult(transform.zeroDenominator, transform.method)
        : finiteOutput(inverseLerp(values[index], minimum, maximum), transform.method);
    });
    return;
  }
  if (transform.method === "zscore") {
    if (transform.variance === "sample" && values.length < 2) {
      throw new RangeError("Normalize sample zscore requires at least two values.");
    }
    const { mean, deviation } = stableFiniteDeviation(values, {
      sample: transform.variance === "sample",
      label: "Normalize zscore deviation"
    });
    group.forEach((entry, index) => {
      outputs[entry.index] = deviation === 0
        ? zeroResult(transform.zeroDenominator, transform.method)
        : zscore(values[index], mean, deviation, transform.method);
    });
    return;
  }

  const sorted = [...group].sort((left, right) =>
    compareEntries(left, right, transform.sortBy)
  );
  const baseline = Object.hasOwn(transform.baseline, "value")
    ? transform.baseline.value
    : sorted[transform.baseline.position === "first" ? 0 : sorted.length - 1]
      .row[transform.field];
  group.forEach(entry => {
    const value = entry.row[transform.field];
    if (transform.method === "change") {
      outputs[entry.index] = finiteOutput(value - baseline, transform.method);
    } else if (baseline === 0) {
      outputs[entry.index] = zeroResult(transform.zeroDenominator, transform.method);
    } else if (transform.method === "index") {
      outputs[entry.index] = finiteOutput(value / baseline * 100, transform.method);
    } else {
      outputs[entry.index] = finiteOutput(value / baseline - 1, transform.method);
    }
  });
}

export function deriveNormalizedRows(rows, transform) {
  validateNormalizeTransform(transform);
  validateRows(rows, transform);
  if (rows.length === 0) return cloneAndFreeze([]);
  const outputs = new Array(rows.length);
  for (const group of groupRows(rows, transform)) applyGroup(group, transform, outputs);
  return cloneAndFreeze(rows.map((row, index) => ({
    ...row,
    [transform.as]: outputs[index]
  })));
}
