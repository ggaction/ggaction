import { normalizeOrderedRange, orderedRangeContains } from "./orderedRange.js";
import { inspectPredicateExpression, normalizePredicateExpression } from "./expressionAst.js";
import { evaluatePredicateExpression } from "./conditionalEncoding.js";
import { validateExpressionParameterInputs } from "./expressionInputs.js";
import { record } from "./expressionValues.js";
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
  normalizeOrderedRange(range, "Filter range");
}

function normalizeRange(range) {
  return normalizeOrderedRange(range, "Filter range");
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
  if (isPlainObject(transform) && Object.hasOwn(transform, "where")) {
    record(transform, ["type", "where", "parameterInputs"], [], "Expression filter");
    if (transform.type !== "filter") throw new TypeError("Expression filter requires type filter.");
    const inspected = inspectPredicateExpression(transform.where);
    validateExpressionParameterInputs(transform.parameterInputs, inspected.parameters, "Filter");
    return inspected.nodes;
  }
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
  nulls,
  where
}, environment) {
  if (where !== undefined) {
    if ([field, oneOf, noneOf, predicate, range, nulls].some(value => value !== undefined)) {
      throw new TypeError("Filter where cannot be combined with field filter options.");
    }
    const normalized = environment === undefined
      ? inspectPredicateExpression(where) : normalizePredicateExpression(where, environment);
    return cloneAndFreeze({ type: "filter", where: normalized.expression });
  }
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
  const modes = ["oneOf", "noneOf", "predicate", "range", "where"];
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
  if (mode === "where" && (Object.hasOwn(patch, "field") || Object.hasOwn(patch, "nulls"))) {
    throw new TypeError("Filter where cannot be combined with field filter options.");
  }
  const nulls = patch.nulls === false ? undefined : (patch.nulls ?? transform.nulls);
  return normalizeFilterTransform({
    ...(mode === "where" ? {} : { field: patch.field ?? transform.field }),
    [mode]: modeValue,
    ...(mode === "where" || nulls === undefined ? {} : { nulls })
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
  return orderedRangeContains(value, transform.range);
}

export function deriveFilteredRows(values, transform, environment) {
  if (!Array.isArray(values)) {
    throw new TypeError("Filter source values must be an array.");
  }
  validateFilterTransform(transform);
  if (transform.where !== undefined) {
    const evaluated = evaluatePredicateExpression(transform.where, values, environment);
    return values.filter((_, index) => evaluated.values[index]);
  }
  return values.filter(row => {
    if (!isPlainObject(row)) return false;
    const value = row[transform.field];
    if (value === null || value === undefined) {
      if (transform.nulls !== undefined) return transform.nulls === "include";
    }
    return matches(value, transform);
  });
}
