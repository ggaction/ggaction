import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

export const FILTER_COMPARISON_OPERATORS = Object.freeze([
  "eq", "neq", "lt", "lte", "gt", "gte"
]);

function isFiniteOrString(value) {
  return typeof value === "string" || Number.isFinite(value);
}

function validatePredicate(predicate) {
  if (!isPlainObject(predicate)) {
    throw new TypeError("Filter predicate must be a plain object.");
  }
  const unknown = Object.keys(predicate).find(
    key => !["op", "value"].includes(key)
  );
  if (unknown !== undefined) {
    throw new Error(`Unknown filter predicate property "${unknown}".`);
  }
  if (!FILTER_COMPARISON_OPERATORS.includes(predicate.op)) {
    throw new Error(`Unsupported filter comparison operator "${predicate.op}".`);
  }
  if (!Object.hasOwn(predicate, "value")) {
    throw new TypeError("Filter predicate requires a value.");
  }
  if (
    !["eq", "neq"].includes(predicate.op) &&
    !isFiniteOrString(predicate.value)
  ) {
    throw new TypeError(
      "Ordered filter comparison values must be finite numbers or strings."
    );
  }
}

function validateRange(range) {
  if (!isPlainObject(range)) {
    throw new TypeError("Filter range must be a plain object.");
  }
  const unknown = Object.keys(range).find(
    key => !["min", "max", "inclusive", "minInclusive", "maxInclusive"].includes(key)
  );
  if (unknown !== undefined) {
    throw new Error(`Unknown filter range property "${unknown}".`);
  }
  const hasMin = Object.hasOwn(range, "min");
  const hasMax = Object.hasOwn(range, "max");
  if (!hasMin && !hasMax) throw new TypeError("Filter range requires min or max.");
  if ((hasMin && !isFiniteOrString(range.min)) || (hasMax && !isFiniteOrString(range.max))) {
    throw new TypeError("Filter range endpoints must be finite numbers or strings.");
  }
  if (hasMin && hasMax && typeof range.min !== typeof range.max) {
    throw new TypeError("Filter range endpoints must use one type.");
  }
  if (hasMin && hasMax && range.min > range.max) {
    throw new RangeError("Filter range min must not exceed max.");
  }
  if (range.inclusive !== undefined && typeof range.inclusive !== "boolean") {
    throw new TypeError("Filter range inclusive must be a boolean.");
  }
  if (range.inclusive !== undefined && (
    range.minInclusive !== undefined || range.maxInclusive !== undefined
  )) throw new Error("Filter range cannot combine inclusive with endpoint inclusivity.");
  for (const [key, endpoint] of [["minInclusive", "min"], ["maxInclusive", "max"]]) {
    if (range[key] !== undefined && typeof range[key] !== "boolean") {
      throw new TypeError(`Filter range ${key} must be a boolean.`);
    }
    if (range[key] !== undefined && !Object.hasOwn(range, endpoint)) {
      throw new Error(`Filter range ${key} requires ${endpoint}.`);
    }
  }
}

function normalizeRange(range) {
  validateRange(range);
  const shared = range.inclusive;
  return {
    ...(Object.hasOwn(range, "min") ? { min: range.min, minInclusive: shared ?? range.minInclusive ?? true } : {}),
    ...(Object.hasOwn(range, "max") ? { max: range.max, maxInclusive: shared ?? range.maxInclusive ?? true } : {})
  };
}

function normalizeSet(values, name) {
  if (!Array.isArray(values) || values.length === 0 ||
      Array.from({ length: values.length }, (_, index) => index).some(index => !Object.hasOwn(values, index)) ||
      values.some(value => value !== null && typeof value !== "string" && typeof value !== "boolean" && !(typeof value === "number" && Number.isFinite(value)))) {
    throw new TypeError(`Filter ${name} must be a non-empty dense array of scalar values.`);
  }
  return [...new Set(values)];
}

export function validateFilterTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Filter transform must be a plain object.");
  }
  const supported = ["type", "field", "oneOf", "noneOf", "predicate", "range", "nulls"];
  const unknown = Object.keys(transform).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown filter transform property "${unknown}".`);
  }
  if (typeof transform.field !== "string" || transform.field.length === 0) {
    throw new TypeError("Filter field must be a non-empty field string.");
  }
  if (transform.nulls !== undefined && !["include", "exclude"].includes(transform.nulls)) {
    throw new Error('Filter nulls must be "include" or "exclude".');
  }
  const modes = ["oneOf", "noneOf", "predicate", "range"].filter(
    key => Object.hasOwn(transform, key)
  );
  if (modes.length !== 1) {
    throw new Error(
      "Filter transform requires exactly one of oneOf, noneOf, predicate, or range."
    );
  }
  if (modes[0] === "predicate") {
    validatePredicate(transform.predicate);
    return;
  }
  if (modes[0] === "range") {
    validateRange(transform.range);
    return;
  }
  normalizeSet(transform[modes[0]], modes[0]);
}

export function normalizeFilterTransform({
  field,
  oneOf,
  noneOf,
  predicate,
  range,
  nulls
}) {
  const modes = { oneOf, noneOf, predicate, range };
  const selected = Object.keys(modes).filter(key => modes[key] !== undefined);
  const transform = {
    type: "filter",
    field,
    ...(selected[0] === "oneOf" ? { oneOf: normalizeSet(oneOf, "oneOf") } : {}),
    ...(selected[0] === "noneOf" ? { noneOf: normalizeSet(noneOf, "noneOf") } : {}),
    ...(selected[0] === "predicate" ? { predicate } : {}),
    ...(selected[0] === "range"
      ? { range: normalizeRange(range) }
      : {}),
    ...(nulls === undefined ? {} : { nulls })
  };
  if (selected.length !== 1) {
    throw new Error(
      "filterData requires exactly one of oneOf, noneOf, predicate, or range."
    );
  }
  validateFilterTransform(transform);
  return cloneAndFreeze(transform);
}

export function normalizeFilterTransformEdit(transform, patch) {
  const modes = ["oneOf", "noneOf", "predicate", "range"];
  const previousMode = modes.find(key => Object.hasOwn(transform, key));
  const requestedModes = modes.filter(key => Object.hasOwn(patch, key));
  if (requestedModes.length > 1) {
    throw new Error("Filter edit can replace only one filter mode.");
  }
  const fieldChanged = Object.hasOwn(patch, "field") && patch.field !== transform.field;
  if (fieldChanged && requestedModes.length === 0) {
    throw new Error("Changing a filter field requires a complete filter mode.");
  }
  let mode = previousMode;
  let modeValue = transform[previousMode];
  if (requestedModes.length === 1) {
    mode = requestedModes[0];
    if (mode === "range" && previousMode === "range" && !fieldChanged) {
      if (!isPlainObject(patch.range)) throw new TypeError("Filter range patch must be a plain object.");
      const legacy = normalizeRange(transform.range);
      const next = { ...legacy };
      const rangePatch = patch.range;
      const unknown = Object.keys(rangePatch).find(key => !["min", "max", "inclusive", "minInclusive", "maxInclusive"].includes(key));
      if (unknown !== undefined) throw new Error(`Unknown filter range property "${unknown}".`);
      if (rangePatch.inclusive !== undefined && (rangePatch.minInclusive !== undefined || rangePatch.maxInclusive !== undefined)) {
        throw new Error("Filter range cannot combine inclusive with endpoint inclusivity.");
      }
      for (const endpoint of ["min", "max"]) {
        if (!Object.hasOwn(rangePatch, endpoint)) continue;
        if (rangePatch[endpoint] === false) {
          delete next[endpoint];
          delete next[`${endpoint}Inclusive`];
        } else {
          next[endpoint] = rangePatch[endpoint];
          next[`${endpoint}Inclusive`] = Object.hasOwn(legacy, endpoint)
            ? legacy[`${endpoint}Inclusive`]
            : true;
        }
      }
      if (rangePatch.inclusive !== undefined) {
        if (typeof rangePatch.inclusive !== "boolean") throw new TypeError("Filter range inclusive must be a boolean.");
        if (Object.hasOwn(next, "min")) next.minInclusive = rangePatch.inclusive;
        if (Object.hasOwn(next, "max")) next.maxInclusive = rangePatch.inclusive;
      }
      for (const endpoint of ["min", "max"]) {
        const key = `${endpoint}Inclusive`;
        if (rangePatch[key] !== undefined) {
          if (!Object.hasOwn(next, endpoint)) throw new Error(`Filter range ${key} requires ${endpoint}.`);
          next[key] = rangePatch[key];
        }
      }
      modeValue = next;
    } else {
      modeValue = patch[mode];
    }
  }
  const nulls = patch.nulls === false ? undefined : (patch.nulls ?? transform.nulls);
  return normalizeFilterTransform({
    field: patch.field ?? transform.field,
    [mode]: modeValue,
    ...(nulls === undefined ? {} : { nulls })
  });
}

function comparable(value, operand) {
  return (
    Number.isFinite(value) && Number.isFinite(operand)
  ) || (
    typeof value === "string" && typeof operand === "string"
  );
}

function matches(value, transform) {
  if (transform.oneOf !== undefined) {
    return transform.oneOf.includes(value);
  }
  if (transform.noneOf !== undefined) return !transform.noneOf.includes(value);
  if (transform.predicate !== undefined) {
    const { op, value: operand } = transform.predicate;
    if (op === "eq") return value === operand;
    if (op === "neq") return value !== operand;
    if (!comparable(value, operand)) return false;
    if (op === "lt") return value < operand;
    if (op === "lte") return value <= operand;
    if (op === "gt") return value > operand;
    return value >= operand;
  }
  const { min, max, minInclusive = transform.range.inclusive ?? true, maxInclusive = transform.range.inclusive ?? true } = transform.range;
  if (min !== undefined && !comparable(value, min)) return false;
  if (max !== undefined && !comparable(value, max)) return false;
  if (min !== undefined && (value < min || (value === min && !minInclusive))) return false;
  if (max !== undefined && (value > max || (value === max && !maxInclusive))) return false;
  return true;
}

export function deriveFilteredRows(values, transform) {
  if (!Array.isArray(values)) {
    throw new TypeError("Filter source values must be an array.");
  }
  validateFilterTransform(transform);
  return values.filter(row => {
    if (!isPlainObject(row)) return false;
    const value = row[transform.field];
    if (value === null || value === undefined) {
      if (transform.nulls !== undefined) return transform.nulls === "include";
    }
    return matches(value, transform);
  });
}
