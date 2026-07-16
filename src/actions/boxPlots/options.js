import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import { validatePointShape } from "../../grammar/pointShapes.js";

export const BOX_PLOT_OPTIONS = Object.freeze([
  "id", "target", "data", "x", "y", "coordinate", "whisker",
  "width", "outliers", "box", "median", "outlier"
]);

const DEFAULT_BOX = Object.freeze({
  fill: "#4c78a8",
  opacity: 1,
  stroke: "#4c78a8",
  strokeWidth: 1.5
});
const DEFAULT_MEDIAN = Object.freeze({ stroke: "#1f2937", strokeWidth: 1.5 });
const DEFAULT_OUTLIER = Object.freeze({
  shape: "diamond",
  radius: 3,
  opacity: 0.75
});

function plainOptions(value, keys, label) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new TypeError(`createBoxPlot ${label} must be a plain object.`);
  }
  validateKeys(value, keys, `createBoxPlot ${label}`);
  return value;
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`createBoxPlot ${label} must be a non-empty string.`);
  }
  return value;
}

function opacity(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`createBoxPlot ${label} must be between 0 and 1.`);
  }
  return value;
}

function nonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `createBoxPlot ${label} must be a non-negative finite number.`
    );
  }
  return value;
}

function positive(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`createBoxPlot ${label} must be a positive finite number.`);
  }
  return value;
}

export function resolveBoxPosition(value, label) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    throw new TypeError(`createBoxPlot ${label} must be a plain object.`);
  }
  validateKeys(value, ["field", "fieldType", "scale"], `createBoxPlot ${label}`);
  return value;
}

export function boxEncodingArgs(value) {
  return {
    ...value,
    ...(typeof value.scale === "string" ? { scale: { id: value.scale } } : {})
  };
}

export function resolveBoxWhisker(value) {
  if (value === undefined) return Object.freeze({ type: "tukey", factor: 1.5 });
  if (!isPlainObject(value)) {
    throw new TypeError("createBoxPlot whisker must be a plain object.");
  }
  validateKeys(value, ["type", "factor"], "createBoxPlot whisker");
  const type = value.type ?? "tukey";
  if (!["tukey", "minmax"].includes(type)) {
    throw new Error(`Unsupported createBoxPlot whisker type "${type}".`);
  }
  if (type === "minmax") {
    if (value.factor !== undefined) {
      throw new Error("createBoxPlot minmax whiskers do not accept factor.");
    }
    return Object.freeze({ type });
  }
  const factor = value.factor ?? 1.5;
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new RangeError(
      "createBoxPlot whisker factor must be positive and finite."
    );
  }
  return Object.freeze({ type, factor });
}

export function resolveBoxWidth(value) {
  const options = plainOptions(value, ["band"], "width");
  const band = options.band ?? 0.7;
  if (!Number.isFinite(band) || band <= 0 || band >= 1) {
    throw new RangeError(
      "createBoxPlot width.band must be greater than 0 and less than 1."
    );
  }
  return band;
}

export function resolveBoxAppearance(value) {
  const options = plainOptions(
    value,
    ["fill", "opacity", "stroke", "strokeWidth"],
    "box"
  );
  return Object.freeze({
    fill: options.fill === undefined
      ? DEFAULT_BOX.fill
      : nonEmptyString(options.fill, "box.fill"),
    opacity: options.opacity === undefined
      ? DEFAULT_BOX.opacity
      : opacity(options.opacity, "box.opacity"),
    stroke: options.stroke === undefined
      ? DEFAULT_BOX.stroke
      : nonEmptyString(options.stroke, "box.stroke"),
    strokeWidth: options.strokeWidth === undefined
      ? DEFAULT_BOX.strokeWidth
      : nonNegative(options.strokeWidth, "box.strokeWidth")
  });
}

export function resolveBoxMedianAppearance(value) {
  const options = plainOptions(value, ["stroke", "strokeWidth"], "median");
  return Object.freeze({
    stroke: options.stroke === undefined
      ? DEFAULT_MEDIAN.stroke
      : nonEmptyString(options.stroke, "median.stroke"),
    strokeWidth: options.strokeWidth === undefined
      ? DEFAULT_MEDIAN.strokeWidth
      : nonNegative(options.strokeWidth, "median.strokeWidth")
  });
}

export function resolveBoxOutlierAppearance(value) {
  const options = plainOptions(value, ["shape", "radius", "opacity"], "outlier");
  return Object.freeze({
    shape: options.shape === undefined
      ? DEFAULT_OUTLIER.shape
      : validatePointShape(options.shape),
    radius: options.radius === undefined
      ? DEFAULT_OUTLIER.radius
      : positive(options.radius, "outlier.radius"),
    opacity: options.opacity === undefined
      ? DEFAULT_OUTLIER.opacity
      : opacity(options.opacity, "outlier.opacity")
  });
}
