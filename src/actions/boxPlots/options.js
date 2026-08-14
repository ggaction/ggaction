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

const DEFAULT_BOX = {
  fill: DEFAULT_COLORS.mark,
  opacity: 1,
  stroke: DEFAULT_COLORS.mark,
  strokeWidth: 1.5
};
const DEFAULT_MEDIAN = { stroke: "#1f2937", strokeWidth: 1.5 };
const DEFAULT_OUTLIER = {
  shape: "diamond",
  radius: 3,
  opacity: 0.75
};
const APPEARANCE_VALIDATORS = {
  fill: validateNonEmptyString,
  opacity: validateUnitInterval,
  stroke: validateNonEmptyString,
  strokeWidth: validateNonNegativeFinite,
  shape: validatePointShape,
  radius: validatePositiveFinite
};

function plainOptions(value, keys, label, operation = "createBoxPlot") {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} ${label} must be a plain object.`);
  }
  validateKeys(value, keys, `${operation} ${label}`);
  return value;
}

function resolveAppearance(value, defaults, label, operation) {
  const options = plainOptions(
    value,
    Object.keys(defaults),
    label,
    operation
  );
  return Object.freeze(Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      options[key] === undefined
        ? fallback
        : APPEARANCE_VALIDATORS[key](
            options[key],
            `createBoxPlot ${label}.${key}`
          )
    ])
  ));
}

export function resolveBoxPosition(value, label, operation = "createBoxPlot") {
  if (value === undefined) return undefined;
  return plainOptions(value, ["field", "fieldType", "scale"], label, operation);
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
  const options = plainOptions(
    value,
    ["type", "factor"],
    "whisker",
    operation
  );
  const type = options.type ?? "tukey";
  if (!["tukey", "minmax"].includes(type)) {
    throw new Error(`Unsupported createBoxPlot whisker type "${type}".`);
  }
  if (type === "minmax") {
    if (options.factor !== undefined) {
      throw new Error("createBoxPlot minmax whiskers do not accept factor.");
    }
    return Object.freeze({ type });
  }
  const factor = options.factor ?? 1.5;
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
  return resolveAppearance(value, DEFAULT_BOX, "box", operation);
}

export function resolveBoxMedianAppearance(value, operation = "createBoxPlot") {
  return resolveAppearance(value, DEFAULT_MEDIAN, "median", operation);
}

export function resolveBoxOutlierAppearance(value, operation = "createBoxPlot") {
  return resolveAppearance(value, DEFAULT_OUTLIER, "outlier", operation);
}
