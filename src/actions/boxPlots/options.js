import { isPlainObject } from "../../core/immutable.js";
import {
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite,
  validateUnitInterval
} from "../../core/validation.js";
import { validatePointShape } from "../../grammar/pointShapes.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { normalizeGuides } from "../charts/shared.js";

export const BOX_PLOT_OPTIONS = Object.freeze([
  "id", "target", "data", "x", "y", "coordinate", "whisker",
  "width", "outliers", "box", "median", "outlier", "guides"
]);

const DEFAULT_BOX = Object.freeze({
  fill: DEFAULT_COLORS.mark,
  opacity: 1,
  stroke: DEFAULT_COLORS.mark,
  strokeWidth: 1.5
});
const DEFAULT_MEDIAN = Object.freeze({ stroke: "#1f2937", strokeWidth: 1.5 });
const DEFAULT_OUTLIER = Object.freeze({
  shape: "diamond",
  radius: 3,
  opacity: 0.75
});

function plainOptions(value, keys, label, operation = "createBoxPlot") {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} ${label} must be a plain object.`);
  }
  validateKeys(value, keys, `${operation} ${label}`);
  return value;
}

export function resolveBoxPosition(value, label, operation = "createBoxPlot") {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} ${label} must be a plain object.`);
  }
  validateKeys(value, ["field", "fieldType", "scale"], `${operation} ${label}`);
  return value;
}

export function boxEncodingArgs(value) {
  return {
    ...value,
    ...(typeof value.scale === "string" ? { scale: { id: value.scale } } : {})
  };
}

export function resolveBoxGuides(value) {
  return value === undefined
    ? false
    : normalizeGuides(value, "createBoxPlot");
}

export function resolveBoxWhisker(value, operation = "createBoxPlot") {
  if (value === undefined) return Object.freeze({ type: "tukey", factor: 1.5 });
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} whisker must be a plain object.`);
  }
  validateKeys(value, ["type", "factor"], `${operation} whisker`);
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

export function resolveBoxWidth(value, operation = "createBoxPlot") {
  const options = plainOptions(value, ["band"], "width", operation);
  const band = options.band ?? 0.7;
  if (!Number.isFinite(band) || band <= 0 || band >= 1) {
    throw new RangeError(
      "createBoxPlot width.band must be greater than 0 and less than 1."
    );
  }
  return band;
}

export function resolveBoxAppearance(value, operation = "createBoxPlot") {
  const options = plainOptions(
    value,
    ["fill", "opacity", "stroke", "strokeWidth"],
    "box",
    operation
  );
  return Object.freeze({
    fill: options.fill === undefined
      ? DEFAULT_BOX.fill
      : validateNonEmptyString(options.fill, "createBoxPlot box.fill"),
    opacity: options.opacity === undefined
      ? DEFAULT_BOX.opacity
      : validateUnitInterval(options.opacity, "createBoxPlot box.opacity"),
    stroke: options.stroke === undefined
      ? DEFAULT_BOX.stroke
      : validateNonEmptyString(options.stroke, "createBoxPlot box.stroke"),
    strokeWidth: options.strokeWidth === undefined
      ? DEFAULT_BOX.strokeWidth
      : validateNonNegativeFinite(
          options.strokeWidth,
          "createBoxPlot box.strokeWidth"
        )
  });
}

export function resolveBoxMedianAppearance(value, operation = "createBoxPlot") {
  const options = plainOptions(
    value,
    ["stroke", "strokeWidth"],
    "median",
    operation
  );
  return Object.freeze({
    stroke: options.stroke === undefined
      ? DEFAULT_MEDIAN.stroke
      : validateNonEmptyString(options.stroke, "createBoxPlot median.stroke"),
    strokeWidth: options.strokeWidth === undefined
      ? DEFAULT_MEDIAN.strokeWidth
      : validateNonNegativeFinite(
          options.strokeWidth,
          "createBoxPlot median.strokeWidth"
        )
  });
}

export function resolveBoxOutlierAppearance(value, operation = "createBoxPlot") {
  const options = plainOptions(
    value,
    ["shape", "radius", "opacity"],
    "outlier",
    operation
  );
  return Object.freeze({
    shape: options.shape === undefined
      ? DEFAULT_OUTLIER.shape
      : validatePointShape(options.shape),
    radius: options.radius === undefined
      ? DEFAULT_OUTLIER.radius
      : validatePositiveFinite(options.radius, "createBoxPlot outlier.radius"),
    opacity: options.opacity === undefined
      ? DEFAULT_OUTLIER.opacity
      : validateUnitInterval(
          options.opacity,
          "createBoxPlot outlier.opacity"
        )
  });
}
