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
import { validateDatasetTransforms } from "../../grammar/transforms.js";
import {
  validateSemanticFieldType,
  validateContinuousColorInterpolation,
  validateScalePropertyForType,
  validateSemanticScaleDomain,
  validateSemanticScaleRange,
  validateSemanticScaleType
} from "../../grammar/scales.js";

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
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
    validateDatasetTransforms(value);
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
      for (const owned of [
        "nice", "zero", "clamp", "base", "exponent", "constant",
        "paddingInner", "paddingOuter", "padding", "align"
      ]) {
        if (existing?.[owned] !== undefined) {
          validateScalePropertyForType(value, owned);
        }
      }
    } else if (property === "domain") validateSemanticScaleDomain(value);
    else if (property === "range") validateSemanticScaleRange(value);
    else if (property === "nice") {
      if (typeof value !== "boolean") throw new TypeError("Scale nice must be a boolean.");
      if (existing?.type !== undefined) {
        validateScalePropertyForType(existing.type, "nice");
      }
    } else if (property === "zero") {
      if (typeof value !== "boolean") throw new TypeError("Scale zero must be a boolean.");
      if (existing?.type !== undefined) {
        validateScalePropertyForType(existing.type, "zero");
      }
    } else if (property === "clamp") {
      if (typeof value !== "boolean") throw new TypeError("Scale clamp must be a boolean.");
      if (existing?.type !== undefined) {
        validateScalePropertyForType(existing.type, "clamp");
      }
    } else if (property === "reverse") {
      if (typeof value !== "boolean") throw new TypeError("Scale reverse must be a boolean.");
    } else if (["base", "exponent", "constant"].includes(property)) {
      if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError(`Scale ${property} must be a positive finite number.`);
      }
      if (property === "base" && value === 1) {
        throw new RangeError("Scale base must not equal 1.");
      }
      if (existing?.type !== undefined) {
        validateScalePropertyForType(existing.type, property);
      }
    } else if (property === "interpolate") {
      validateContinuousColorInterpolation(value);
    } else if (property === "paddingInner") {
      if (!Number.isFinite(value) || value < 0 || value >= 1) {
        throw new RangeError(
          "Scale paddingInner must be from 0 (inclusive) to 1 (exclusive)."
        );
      }
      if (existing?.type !== undefined) {
        validateScalePropertyForType(existing.type, property);
      }
    } else if (property === "paddingOuter" || property === "padding") {
      if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(`Scale ${property} must be a non-negative finite number.`);
      }
      if (existing?.type !== undefined) {
        validateScalePropertyForType(existing.type, property);
      }
    } else if (property === "align") {
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new RangeError("Scale align must be between 0 and 1.");
      }
      if (existing?.type !== undefined) {
        validateScalePropertyForType(existing.type, property);
      }
    }
  }
  if (parsed.kind === "coordinate" && parsed.path[0] === "type") {
    validateCoordinateType(value);
  }
  if (parsed.kind === "guide" && parsed.id === "legend.series") {
    validateLegend(parsed.path.at(-1), value);
  }
  if (parsed.kind === "guide" && (
    parsed.id.startsWith("grid.") || parsed.id.startsWith("axis.")
  )) {
    const property = parsed.path.at(-1);
    if (property === "title") nonEmptyString(value, "Axis title");
    else {
      const guideKind = parsed.id.startsWith("grid.") ? "Grid" : "Axis";
      validateUserId(value, `${guideKind} ${property} id`);
    }
  }
  if (parsed.kind === "title") {
    nonEmptyString(value, `Chart title ${parsed.path[0]}`);
  }
}
