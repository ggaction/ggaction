import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import {
  deriveKernelDensity,
  validateDensityKernel,
  validateDensityNormalization
} from "./density.js";

export const GRADIENT_PROFILE_FIELDS = Object.freeze({
  category: "__gradientPlot_category",
  values: "__gradientPlot_values",
  intensities: "__gradientPlot_intensities",
  lower: "__gradientPlot_lower",
  upper: "__gradientPlot_upper",
  center: "__gradientPlot_center",
  count: "__gradientPlot_count"
});

const TRANSFORM_KEYS = Object.freeze([
  "type", "category", "field", "bandwidth", "extent", "steps", "kernel",
  "normalization", "center", "as", "resolve", "resolved"
]);
const OUTPUT_KEYS = Object.freeze(Object.keys(GRADIENT_PROFILE_FIELDS));

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function validatePair(value, label) {
  if (
    !Array.isArray(value) || value.length !== 2 ||
    !value.every(Number.isFinite) || value[0] >= value[1]
  ) {
    throw new RangeError(`${label} must be an ascending pair of finite numbers.`);
  }
  return value;
}

function validateOutputs(as, occupied) {
  if (!isPlainObject(as)) {
    throw new TypeError("Gradient profile as must be a plain object.");
  }
  const keys = Object.keys(as);
  if (
    keys.length !== OUTPUT_KEYS.length ||
    !OUTPUT_KEYS.every(key => Object.hasOwn(as, key))
  ) {
    throw new Error(`Gradient profile as requires exactly ${OUTPUT_KEYS.join(", ")}.`);
  }
  const values = OUTPUT_KEYS.map(key =>
    requireField(as[key], `Gradient profile as.${key}`)
  );
  if (new Set(values).size !== values.length) {
    throw new Error("Gradient profile output fields must be distinct.");
  }
  if (values.some(value => occupied.has(value))) {
    throw new Error("Gradient profile output fields must not collide with input fields.");
  }
}

export function validateGradientProfileTransform(value) {
  if (!isPlainObject(value)) {
    throw new TypeError("Gradient profile transform must be a plain object.");
  }
  const unknown = Object.keys(value).find(key => !TRANSFORM_KEYS.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown gradient profile transform property "${unknown}".`);
  }
  if (value.type !== "gradientProfile") {
    throw new Error(`Unsupported gradient profile transform "${value.type}".`);
  }
  const category = requireField(value.category, "Gradient profile category");
  const field = requireField(value.field, "Gradient profile field");
  if (category === field) {
    throw new Error("Gradient profile category and field must be distinct.");
  }
  if (
    value.bandwidth !== "auto" &&
    (!Number.isFinite(value.bandwidth) || value.bandwidth <= 0)
  ) {
    throw new RangeError(
      "Gradient profile bandwidth must be a positive finite number or auto."
    );
  }
  if (value.extent !== "auto") {
    validatePair(value.extent, "Gradient profile extent");
  }
  if (!Number.isInteger(value.steps) || value.steps < 2) {
    throw new RangeError("Gradient profile steps must be an integer of at least 2.");
  }
  validateDensityKernel(value.kernel);
  validateDensityNormalization(value.normalization);
  if (!["mean", "median"].includes(value.center)) {
    throw new Error(`Unsupported gradient profile center "${value.center}".`);
  }
  if (value.resolve !== "shared") {
    throw new Error(`Unsupported gradient profile resolve "${value.resolve}".`);
  }
  validateOutputs(value.as, new Set([category, field]));
  if (value.resolved !== undefined) {
    const resolved = value.resolved;
    if (
      !isPlainObject(resolved) ||
      Object.keys(resolved).some(key => ![
        "bandwidth", "extent", "intensityDomain"
      ].includes(key)) ||
      !Number.isFinite(resolved.bandwidth) || resolved.bandwidth <= 0
    ) {
      throw new TypeError("Gradient profile resolved provenance is invalid.");
    }
    validatePair(resolved.extent, "Gradient profile resolved extent");
    validatePair(
      resolved.intensityDomain,
      "Gradient profile resolved intensityDomain"
    );
  }
  return value;
}

export function normalizeGradientProfileTransform(options = {}) {
  const transform = {
    type: "gradientProfile",
    category: options.category,
    field: options.field,
    bandwidth: options.bandwidth ?? "auto",
    extent: options.extent ?? "auto",
    steps: options.steps ?? 64,
    kernel: options.kernel ?? "gaussian",
    normalization: options.normalization ?? "unit",
    center: options.center ?? "median",
    as: options.as ?? GRADIENT_PROFILE_FIELDS,
    resolve: "shared"
  };
  validateGradientProfileTransform(transform);
  return cloneAndFreeze(transform);
}

export function requestedGradientProfileTransform(transform) {
  const { resolved: _resolved, ...requested } = transform;
  return cloneAndFreeze(requested);
}

function centerOf(values, type) {
  if (type === "mean") {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = (sorted.length - 1) / 2;
  const lower = Math.floor(middle);
  const upper = Math.ceil(middle);
  return (sorted[lower] + sorted[upper]) / 2;
}

export function deriveGradientProfiles(rows, transform) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Gradient profile rows must be an array.");
  }
  validateGradientProfileTransform(transform);
  const density = deriveKernelDensity(rows, {
    field: transform.field,
    groupBy: transform.category,
    bandwidth: transform.bandwidth,
    extent: transform.extent,
    steps: transform.steps,
    kernel: transform.kernel,
    normalization: transform.normalization,
    as: ["__gradientProfile_value", "__gradientProfile_intensity"]
  });
  const validRows = rows.filter(row =>
    row !== null && typeof row === "object" &&
    row[transform.category] !== undefined && row[transform.category] !== null &&
    row[transform.category] !== "" && Number.isFinite(row[transform.field])
  );
  const maximumIntensity = Math.max(
    ...density.values.map(row => row.__gradientProfile_intensity)
  );
  if (!Number.isFinite(maximumIntensity) || maximumIntensity <= 0) {
    throw new Error("Gradient profile requires a positive resolved density range.");
  }
  const values = density.groups.map(category => {
    const samples = density.values.filter(
      row => row[transform.category] === category
    );
    const observations = validRows
      .filter(row => row[transform.category] === category)
      .map(row => row[transform.field]);
    return {
      [transform.as.category]: category,
      [transform.as.values]: samples.map(row => row.__gradientProfile_value),
      [transform.as.intensities]: samples.map(
        row => row.__gradientProfile_intensity
      ),
      [transform.as.lower]: density.extent[0],
      [transform.as.upper]: density.extent[1],
      [transform.as.center]: centerOf(observations, transform.center),
      [transform.as.count]: observations.length
    };
  });
  return cloneAndFreeze({
    values,
    categories: density.groups,
    bandwidth: density.bandwidth,
    extent: density.extent,
    intensityDomain: [0, maximumIntensity]
  });
}
