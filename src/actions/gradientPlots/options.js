import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateOptionObject,
  validateUnitInterval
} from "../../core/validation.js";
import { normalizePalette } from "../../grammar/palettes.js";

export const GRADIENT_PLOT_OPTIONS = Object.freeze([
  "id", "target", "data", "x", "y", "coordinate", "density", "width",
  "gradient", "center", "guides"
]);

function plain(value, keys, label, operation) {
  if (value === undefined) return {};
  const context = `${operation} ${label}`;
  return validateOptionObject(value, keys, context, {
    plainObjectMessage: `${context} must be a plain object.`
  });
}

export function resolveGradientPosition(value, label, operation = "createGradientPlot") {
  if (value === undefined) return undefined;
  if (typeof value === "string") return { field: value };
  return plain(value, ["field", "fieldType", "scale"], label, operation);
}

export function gradientEncodingArgs(value) {
  return {
    ...value,
    ...(typeof value.scale === "string" ? { scale: { id: value.scale } } : {})
  };
}

export function resolveGradientDensity(value, previous, operation = "createGradientPlot") {
  const options = plain(value, [
    "bandwidth", "extent", "steps", "kernel", "normalization"
  ], "density", operation);
  return Object.freeze({
    bandwidth: options.bandwidth ?? previous?.bandwidth ?? "auto",
    extent: options.extent ?? previous?.extent ?? "auto",
    steps: options.steps ?? previous?.steps ?? 64,
    kernel: options.kernel ?? previous?.kernel ?? "gaussian",
    normalization: options.normalization ?? previous?.normalization ?? "unit"
  });
}

export function resolveGradientWidth(value, previous, operation = "createGradientPlot") {
  const options = plain(value, ["band"], "width", operation);
  const band = options.band ?? previous?.band ?? 0.7;
  if (!Number.isFinite(band) || band <= 0 || band >= 1) {
    throw new RangeError(
      `${operation} width.band must be greater than 0 and less than 1.`
    );
  }
  return Object.freeze({ band });
}

function opacityPair(value, fallback, operation) {
  const opacity = value ?? fallback ?? [0, 1];
  if (!Array.isArray(opacity) || opacity.length !== 2) {
    throw new TypeError(`${operation} gradient.opacity must contain two values.`);
  }
  const normalized = opacity.map((item, index) =>
    validateUnitInterval(item, `${operation} gradient.opacity[${index}]`)
  );
  return Object.freeze(normalized);
}

export function resolveGradientAppearance(
  value,
  previous,
  operation = "createGradientPlot"
) {
  const options = plain(value, ["palette", "opacity"], "gradient", operation);
  const palette = options.palette === undefined
    ? previous?.palette ?? "blues"
    : normalizePalette(options.palette);
  return Object.freeze({
    palette,
    opacity: opacityPair(options.opacity, previous?.opacity, operation)
  });
}

export function resolveGradientCenter(
  value,
  previous,
  operation = "createGradientPlot"
) {
  if (value === false) return false;
  const options = plain(
    value,
    ["type", "stroke", "strokeWidth"],
    "center",
    operation
  );
  const type = options.type ?? previous?.type ?? "median";
  if (!["mean", "median"].includes(type)) {
    throw new Error(`${operation} center.type must be mean or median.`);
  }
  return Object.freeze({
    type,
    stroke: options.stroke === undefined
      ? previous?.stroke ?? "#0f172a"
      : validateNonEmptyString(options.stroke, `${operation} center.stroke`),
    strokeWidth: options.strokeWidth === undefined
      ? previous?.strokeWidth ?? 1.5
      : validateNonNegativeFinite(
          options.strokeWidth,
          `${operation} center.strokeWidth`
        )
  });
}

export function resolveGradientGuides(value, operation = "createGradientPlot") {
  if (value === false) return false;
  return Object.freeze(plain(value, ["axes", "grid", "legend"], "guides", operation));
}
