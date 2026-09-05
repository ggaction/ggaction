import { resolveOptionalUserId, validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateOptionObject } from "../../core/validation.js";
import { findDataset, requireMaterializedDataset } from "../../selectors/datasets.js";
import { isNominalValue } from "../../grammar/scales/fields.js";
import { hasLayer } from "../../selectors/layers.js";
import { fulfillFacadeGuides } from "../guides/facade.js";

export function validateFacadeOptions(args, supported, operation) {
  return validateOptionObject(args, supported, operation);
}

export function resolveFacadeData(program, requested, operation) {
  if (requested !== undefined) {
    const id = validateUserId(requested, `${operation} dataset id`);
    return requireMaterializedDataset(program, id).id;
  }

  const current = program.context.currentData;
  if (current !== undefined && findDataset(program, current) !== undefined) {
    return requireMaterializedDataset(program, current).id;
  }
  const datasets = program.semanticSpec.datasets;
  if (datasets.length === 1) {
    return requireMaterializedDataset(program, datasets[0].id).id;
  }
  if (datasets.length > 1) {
    throw new Error(
      `${operation} requires data when multiple datasets are available.`
    );
  }
  throw new Error(`${operation} requires data or one inferable dataset.`);
}

export function resolveFacadeId(program, requested, {
  defaultId,
  operation
}) {
  return resolveOptionalUserId(requested, {
    defaultId,
    label: `${operation} id`,
    operation,
    ambiguous: hasLayer(program, defaultId) ||
      program.graphicSpec.objects[defaultId] !== undefined
  });
}

export function normalizeFieldEncoding(value, label) {
  if (typeof value === "string") return { field: value };
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a field string or a plain object.`);
  }
  if (Object.hasOwn(value, "target") || Object.hasOwn(value, "coordinate")) {
    throw new Error(
      `${label} target and coordinate are owned by the chart facade.`
    );
  }
  return { ...value };
}

export function normalizeEncoding(value, label) {
  if (value === undefined) return undefined;
  return normalizeFieldEncoding(value, label);
}

export function inferFacadeFieldType(program, data, encoding, label) {
  if (encoding.fieldType !== undefined) return encoding.fieldType;
  if (typeof encoding.field !== "string" || encoding.field.length === 0) {
    throw new TypeError(`${label} field must be a non-empty string.`);
  }
  const dataset = findDataset(program, data);
  const values = dataset.values
    .map(row => row?.[encoding.field])
    .filter(value => value !== undefined && value !== null && value !== "");
  if (values.length === 0) {
    throw new Error(`${label} field "${encoding.field}" has no values.`);
  }
  if (values.every(Number.isFinite)) return "quantitative";
  if (values.every(isNominalValue)) return "nominal";
  throw new Error(
    `${label} field "${encoding.field}" requires an explicit fieldType.`
  );
}

export function normalizeStrokeDashEncoding(
  value,
  label = "createLinePlot strokeDash"
) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    throw new TypeError(
      `${label} must be an encodeStrokeDash option object.`
    );
  }
  if (Object.hasOwn(value, "target")) {
    throw new Error(`${label} target is owned by the chart facade.`);
  }
  return { ...value };
}

export function normalizeAppearance(value, supported, label) {
  if (value === undefined) return {};
  validateOptionObject(value, supported, label);
  return { ...value };
}

export function omitUndefinedOptions(value) {
  return Object.fromEntries(Object.entries(value).filter(([, option]) => option !== undefined));
}

export function normalizeTargetOptions(value, label) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  if (Object.hasOwn(value, "target")) {
    throw new Error(`${label} target is owned by the chart facade.`);
  }
  return { ...value };
}

export function normalizeGuides(value, operation) {
  if (value === false) return false;
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} guides must be false or a plain object.`);
  }
  return { ...value };
}

export function positionArgs(encoding, { target, coordinate }) {
  return {
    ...encoding,
    target,
    ...(coordinate === undefined ? {} : { coordinate })
  };
}

export function targetArgs(encoding, target) {
  return { ...encoding, target };
}

export function applyFacadeGuides(program, guides, target, explicitGuides = guides) {
  return fulfillFacadeGuides(program, guides, target, explicitGuides);
}
