import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  COLOR_LAYOUTS,
  STACK_MODES,
  CATEGORICAL_LEGEND_CHANNELS,
  MARK_TYPES
} from "../../core/vocabulary.js";
import { validateAggregate } from "../../grammar/aggregate.js";
import { findSemanticScale, hasDataset } from "../../selectors/index.js";
import { validateCoordinateType } from "../../grammar/coordinates.js";
import {
  normalizeHistogramBin,
  validateHistogramBinBoundaries,
  validateHistogramBinStep
} from "../../grammar/histogram.js";
import {
  validateDensityKernel,
  validateDensityNormalization
} from "../../grammar/density.js";
import { validateFilterTransform } from "../../grammar/filter.js";
import { validateIntervalTransform } from "../../grammar/interval.js";
import { validateBoxTransform } from "../../grammar/boxPlot.js";
import {
  validateSemanticFieldType,
  validateContinuousColorInterpolation,
  validateSemanticScaleDomain,
  validateSemanticScaleRange,
  validateSemanticScaleType
} from "../../grammar/scales.js";

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function validateRegression(transform) {
  const supported = [
    "type", "method", "x", "y", "groupBy", "confidence", "interval",
    "degree", "span"
  ];
  const unknown = Object.keys(transform).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown regression transform property "${unknown}".`);
  }
  if (!["linear", "polynomial", "loess"].includes(transform.method)) {
    throw new Error(`Unsupported regression method "${transform.method}".`);
  }
  nonEmptyString(transform.x, "Regression x field");
  nonEmptyString(transform.y, "Regression y field");
  if (transform.groupBy !== undefined) {
    nonEmptyString(transform.groupBy, "Regression groupBy field");
  }
  if (transform.method === "loess") {
    if (!Number.isFinite(transform.span) || transform.span <= 0 || transform.span > 1) {
      throw new RangeError("Regression LOESS span must be greater than zero and at most one.");
    }
    if (
      transform.degree !== undefined ||
      transform.confidence !== undefined ||
      transform.interval !== undefined
    ) {
      throw new Error("LOESS regression does not support degree or intervals.");
    }
    return;
  }
  if (transform.span !== undefined) {
    throw new Error("Regression span requires the loess method.");
  }
  if (transform.method === "polynomial") {
    if (!Number.isInteger(transform.degree) || transform.degree < 1) {
      throw new RangeError("Regression polynomial degree must be a positive integer.");
    }
  } else if (transform.degree !== undefined) {
    throw new Error("Regression degree requires the polynomial method.");
  }
  if (!Number.isFinite(transform.confidence) || transform.confidence <= 0 || transform.confidence >= 1) {
    throw new RangeError("Regression confidence must be between 0 and 1.");
  }
  if (!["mean", "prediction"].includes(transform.interval)) {
    throw new Error(`Unsupported regression interval "${transform.interval}".`);
  }
}

function validateDensity(transform) {
  const supported = [
    "type", "field", "groupBy", "bandwidth", "extent", "steps", "as", "resolve",
    "kernel", "normalization"
  ];
  const unknown = Object.keys(transform).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown density transform property "${unknown}".`);
  }
  nonEmptyString(transform.field, "Density field");
  if (transform.groupBy !== undefined) nonEmptyString(transform.groupBy, "Density groupBy");
  validateDensityKernel(transform.kernel ?? "gaussian");
  validateDensityNormalization(transform.normalization ?? "unit");
  if (
    transform.bandwidth !== "auto" &&
    (!Number.isFinite(transform.bandwidth) || transform.bandwidth <= 0)
  ) {
    throw new RangeError("Density bandwidth must be a positive finite number or auto.");
  }
  if (
    transform.extent !== "auto" &&
    (!Array.isArray(transform.extent) ||
      transform.extent.length !== 2 ||
      !transform.extent.every(Number.isFinite) ||
      transform.extent[0] >= transform.extent[1])
  ) {
    throw new RangeError("Density extent must be an ascending pair of finite numbers or auto.");
  }
  if (!Number.isInteger(transform.steps) || transform.steps < 2) {
    throw new RangeError("Density steps must be an integer of at least 2.");
  }
  if (
    !Array.isArray(transform.as) ||
    transform.as.length !== 2 ||
    !transform.as.every(value => typeof value === "string" && value.length > 0) ||
    transform.as[0] === transform.as[1]
  ) {
    throw new TypeError("Density as must contain two distinct non-empty fields.");
  }
  const collisions = new Set([transform.field, transform.groupBy].filter(Boolean));
  if (transform.as.some(value => collisions.has(value))) {
    throw new Error("Density output fields must not collide with source or group fields.");
  }
  if (transform.resolve !== "shared") {
    throw new Error(`Unsupported density resolve "${transform.resolve}".`);
  }
}

function validateTransforms(value) {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isPlainObject)) {
    throw new TypeError("Dataset transform must be a non-empty array of plain objects.");
  }
  const validators = {
    filter: validateFilterTransform,
    regression: validateRegression,
    density: validateDensity,
    interval: validateIntervalTransform,
    boxSummary: validateBoxTransform,
    boxOutlier: validateBoxTransform
  };
  for (const transform of value) {
    const validate = validators[transform.type];
    if (validate === undefined) {
      throw new Error(`Unsupported dataset transform "${transform.type}".`);
    }
    validate(transform);
  }
}

function validateLegend(property, value) {
  if (property === "title") {
    nonEmptyString(value, "Legend title");
    return;
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`Legend ${property} must be a non-empty array.`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`Legend ${property} must not contain duplicates.`);
  }
  if (property === "channels") {
    if (!value.every(channel => CATEGORICAL_LEGEND_CHANNELS.includes(channel))) {
      throw new Error("Legend channels support only color, strokeDash, and shape.");
    }
    return;
  }
  for (const id of value) validateUserId(id, "Legend scale id");
}

export function validateSemanticValue(program, parsed, value) {
  if (parsed.kind === "dataset" && parsed.path[0] === "values") {
    if (!Array.isArray(value) || !value.every(isPlainObject)) {
      throw new TypeError("Dataset values must be an array of plain row objects.");
    }
  }
  if (parsed.kind === "dataset" && parsed.path[0] === "source") {
    validateUserId(value, "Dataset source id");
    if (!hasDataset(program, value)) {
      throw new Error(`Unknown source dataset "${value}".`);
    }
  }
  if (parsed.kind === "dataset" && parsed.path[0] === "transform") {
    validateTransforms(value);
  }
  if (
    parsed.kind === "layer" &&
    parsed.path.join(".") === "mark.type" &&
    !MARK_TYPES.includes(value)
  ) {
    throw new Error(`Unknown mark type "${value}".`);
  }
  if (parsed.kind === "layer") {
    const property = parsed.path.join(".");
    if (property.endsWith(".title")) {
      nonEmptyString(value, "Encoding title");
    }
    if (property.endsWith(".fieldType")) validateSemanticFieldType(value);
    if (property.endsWith(".aggregate")) validateAggregate(value);
    if (property.endsWith(".bin.maxBins")) normalizeHistogramBin({ maxBins: value });
    if (property.endsWith(".bin.step")) validateHistogramBinStep(value);
    if (property.endsWith(".bin.boundaries")) {
      validateHistogramBinBoundaries(value);
    }
    if (
      property.endsWith(".stack") &&
      value !== null &&
      !STACK_MODES.includes(value)
    ) {
      throw new Error(`Unsupported stack "${value}".`);
    }
    if (
      property === "encoding.color.layout" &&
      !COLOR_LAYOUTS.includes(value)
    ) {
      throw new Error(`Unsupported color layout "${value}".`);
    }
  }
  if (parsed.kind === "scale") {
    const property = parsed.path.join(".");
    const existing = findSemanticScale(program, parsed.id);
    if (property === "type") {
      validateSemanticScaleType(value);
      if (value !== "linear" && existing?.zero !== undefined) {
        throw new Error(`Scale type "${value}" does not support zero.`);
      }
      if (value === "ordinal" && existing?.nice !== undefined) {
        throw new Error('Scale type "ordinal" does not support nice.');
      }
    } else if (property === "domain") validateSemanticScaleDomain(value);
    else if (property === "range") validateSemanticScaleRange(value);
    else if (property === "nice") {
      if (typeof value !== "boolean") throw new TypeError("Scale nice must be a boolean.");
      if (existing?.type === "ordinal") throw new Error('Scale type "ordinal" does not support nice.');
    } else if (property === "zero") {
      if (typeof value !== "boolean") throw new TypeError("Scale zero must be a boolean.");
      if (existing?.type !== undefined && existing.type !== "linear") {
        throw new Error(`Scale type "${existing.type}" does not support zero.`);
      }
    } else if (property === "clamp") {
      if (typeof value !== "boolean") throw new TypeError("Scale clamp must be a boolean.");
      if (existing?.type === "ordinal") {
        throw new Error('Scale type "ordinal" does not support clamp.');
      }
    } else if (property === "reverse") {
      if (typeof value !== "boolean") throw new TypeError("Scale reverse must be a boolean.");
    } else if (property === "interpolate") {
      validateContinuousColorInterpolation(value);
    }
  }
  if (parsed.kind === "coordinate" && parsed.path[0] === "type") {
    validateCoordinateType(value);
  }
  if (parsed.kind === "guide" && parsed.id === "legend.series") {
    validateLegend(parsed.path.at(-1), value);
  }
  if (parsed.kind === "guide" && parsed.id.startsWith("grid.")) {
    validateUserId(value, `Grid ${parsed.path.at(-1)} id`);
  }
  if (parsed.kind === "title") {
    nonEmptyString(value, `Chart title ${parsed.path[0]}`);
  }
}
