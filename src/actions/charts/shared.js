import { resolveOptionalUserId, validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateOptionObject } from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";
import { hasLayer } from "../../selectors/layers.js";

export function validateFacadeOptions(args, supported, operation) {
  return validateOptionObject(args, supported, operation);
}

export function resolveFacadeData(program, requested, operation) {
  if (requested !== undefined) {
    const id = validateUserId(requested, `${operation} dataset id`);
    if (findDataset(program, id) === undefined) {
      throw new Error(`Unknown dataset "${id}".`);
    }
    return id;
  }

  const current = program.context.currentData;
  if (current !== undefined && findDataset(program, current) !== undefined) {
    return current;
  }
  const datasets = program.semanticSpec.datasets;
  if (datasets.length === 1) return datasets[0].id;
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

export function normalizeStrokeDashEncoding(value) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    throw new TypeError(
      "createLinePlot strokeDash must be an encodeStrokeDash option object."
    );
  }
  if (Object.hasOwn(value, "target")) {
    throw new Error("createLinePlot strokeDash target is owned by the chart facade.");
  }
  return { ...value };
}

export function normalizeAppearance(value, supported, label) {
  if (value === undefined) return {};
  validateOptionObject(value, supported, label);
  return { ...value };
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

export function applyFacadeGuides(program, guides) {
  return guides === false ? program : program.createGuides(guides);
}
