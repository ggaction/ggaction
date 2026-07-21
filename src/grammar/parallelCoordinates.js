import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";
import { validateOptionObject } from "../core/validation.js";
import {
  mapContinuousScaleValues,
  mapOrdinalPositionValues,
  validateSemanticFieldType
} from "./scales/index.js";

const DIMENSION_OPTIONS = Object.freeze([
  "field", "fieldType", "title", "scale"
]);
const FIELD_TYPES = new Set(["quantitative", "ordinal"]);
const MISSING_POLICIES = new Set(["break", "drop-row", "error"]);
const DIMENSION_SCALE_OPTIONS = Object.freeze([
  "type", "domain", "range", "nice", "zero", "clamp", "reverse",
  "base", "exponent", "constant", "paddingInner", "paddingOuter",
  "padding", "align", "unknown"
]);

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

export function validateParallelKeyField(value) {
  return nonEmptyString(value, "Parallel key field");
}

function inferFieldType(rows, field) {
  const values = rows
    .map(row => row[field])
    .filter(value => value !== undefined && value !== null);
  if (values.length === 0) {
    throw new Error(`Cannot infer Parallel field type for "${field}".`);
  }
  if (values.every(Number.isFinite)) return "quantitative";
  if (values.every(value => typeof value === "string")) return "ordinal";
  throw new Error(
    `Parallel dimension "${field}" requires an explicit compatible fieldType.`
  );
}

function validateScaleOptions(value, index) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new TypeError(`Parallel dimension ${index} scale must be a plain object.`);
  }
  validateOptionObject(
    value,
    DIMENSION_SCALE_OPTIONS,
    `Parallel dimension ${index} scale`
  );
  return { ...value };
}

export function validateParallelMissingPolicy(value) {
  if (!MISSING_POLICIES.has(value)) {
    throw new Error(`Unsupported Parallel missing policy "${value}".`);
  }
  return value;
}

export function validateParallelDimensions(dimensions, { normalized = false } = {}) {
  if (!Array.isArray(dimensions) || dimensions.length < 2) {
    throw new RangeError("Parallel coordinates require at least two dimensions.");
  }
  const fields = new Set();
  for (const [index, dimension] of dimensions.entries()) {
    if (!isPlainObject(dimension)) {
      throw new TypeError(`Parallel dimension ${index} must be an object.`);
    }
    const supported = normalized
      ? ["field", "fieldType", "title", "scale"]
      : DIMENSION_OPTIONS;
    validateOptionObject(dimension, supported, `Parallel dimension ${index}`);
    const field = nonEmptyString(
      dimension.field,
      `Parallel dimension ${index} field`
    );
    if (fields.has(field)) {
      throw new Error("Parallel dimensions must use unique fields.");
    }
    fields.add(field);
    validateSemanticFieldType(dimension.fieldType);
    if (!FIELD_TYPES.has(dimension.fieldType)) {
      throw new Error(`Unsupported Parallel field type "${dimension.fieldType}".`);
    }
    nonEmptyString(dimension.title, `Parallel dimension ${index} title`);
    validateUserId(dimension.scale, `Parallel dimension ${index} scale id`);
  }
  return dimensions;
}

export function normalizeParallelDimensions(rows, dimensions, target) {
  if (!Array.isArray(dimensions) || dimensions.length < 2) {
    throw new RangeError("Parallel coordinates require at least two dimensions.");
  }
  const normalized = dimensions.map((input, index) => {
    const dimension = typeof input === "string" ? { field: input } : input;
    if (!isPlainObject(dimension)) {
      throw new TypeError(
        `Parallel dimension ${index} must be a field string or plain object.`
      );
    }
    validateOptionObject(
      dimension,
      DIMENSION_OPTIONS,
      `Parallel dimension ${index}`
    );
    const field = nonEmptyString(
      dimension.field,
      `Parallel dimension ${index} field`
    );
    const fieldType = dimension.fieldType ?? inferFieldType(rows, field);
    if (!FIELD_TYPES.has(fieldType)) {
      throw new Error(`Unsupported Parallel field type "${fieldType}".`);
    }
    const scale = validateScaleOptions(dimension.scale, index);
    return {
      field,
      fieldType,
      title: dimension.title ?? field,
      scale: `${target}-parallel-${index}`,
      scaleOptions: scale
    };
  });
  const fields = normalized.map(dimension => dimension.field);
  if (new Set(fields).size !== fields.length) {
    throw new Error("Parallel dimensions must use unique fields.");
  }
  return cloneAndFreeze(normalized);
}

function validDimensionValue(value, fieldType) {
  return fieldType === "quantitative"
    ? Number.isFinite(value)
    : typeof value === "string" || Number.isFinite(value);
}

function commandsFromVertices(vertices) {
  const commands = [];
  let fragment = [];
  const flush = () => {
    if (fragment.length >= 2) {
      fragment.forEach((point, index) => commands.push({
        op: index === 0 ? "M" : "L",
        x: point.x,
        y: point.y
      }));
    }
    fragment = [];
  };
  for (const vertex of vertices) {
    if (vertex === undefined) flush();
    else fragment.push(vertex);
  }
  flush();
  return commands;
}

export function validateParallelRows(rows, dimensions, { key, missing }) {
  const seen = new Set();
  rows.forEach((row, index) => {
    if (key !== undefined) {
      const value = row[key];
      if (value === undefined || value === null || value === "") {
        throw new Error(`Parallel key is missing at row ${index}.`);
      }
      const token = `${typeof value}:${String(value)}`;
      if (seen.has(token)) throw new Error(`Duplicate Parallel key "${value}".`);
      seen.add(token);
    }
    const incomplete = dimensions.some(dimension =>
      !validDimensionValue(row[dimension.field], dimension.fieldType)
    );
    if (incomplete && missing === "error") {
      throw new Error(`Parallel row ${index} has a missing dimension.`);
    }
  });
}

export function materializeParallelRows(rows, dimensions, resolvedScales, bounds, {
  key,
  missing
}) {
  validateParallelRows(rows, dimensions, { key, missing });
  const step = bounds.width / (dimensions.length - 1);
  const items = [];
  rows.forEach((row, sourceRowIndex) => {
    const vertices = dimensions.map((dimension, index) => {
      const value = row[dimension.field];
      if (!validDimensionValue(value, dimension.fieldType)) return undefined;
      const scale = resolvedScales[dimension.scale];
      const mapped = dimension.fieldType === "quantitative"
        ? mapContinuousScaleValues([value], scale)[0]
        : mapOrdinalPositionValues([value], scale)[0];
      return Number.isFinite(mapped)
        ? { x: bounds.x + step * index, y: mapped, value, dimension: dimension.field }
        : undefined;
    });
    const incomplete = vertices.some(vertex => vertex === undefined);
    if (incomplete && missing === "drop-row") return;
    items.push({
      key: key === undefined ? `source:${sourceRowIndex}` : row[key],
      sourceRowIndex,
      commands: commandsFromVertices(vertices)
    });
  });
  return cloneAndFreeze(items);
}
