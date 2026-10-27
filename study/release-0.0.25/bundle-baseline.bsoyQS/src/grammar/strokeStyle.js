import { freezeOwned, isPlainObject } from "../core/immutable.js";

export const DEFAULT_LINE_CAP = "butt";
export const DEFAULT_LINE_JOIN = "miter";
export const DEFAULT_MITER_LIMIT = 10;

export const LINE_CAPS = Object.freeze(["butt", "round", "square"]);
export const LINE_JOINS = Object.freeze(["miter", "round", "bevel"]);
export const STROKE_STYLE_PROPERTIES = Object.freeze([
  "lineCap",
  "lineJoin",
  "miterLimit"
]);

function validateEnum(value, values, property, label) {
  if (typeof value !== "string") {
    throw new TypeError(`${label} ${property} must be a string.`);
  }
  if (!values.includes(value)) {
    throw new Error(
      `${label} ${property} must be one of ${values.join(", ")}.`
    );
  }
  return value;
}

export function validateLineCap(value, label = "Stroke style") {
  return validateEnum(value, LINE_CAPS, "lineCap", label);
}

export function validateLineJoin(value, label = "Stroke style") {
  return validateEnum(value, LINE_JOINS, "lineJoin", label);
}

export function validateMiterLimit(value, label = "Stroke style") {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} miterLimit must be a finite number.`);
  }
  if (!(value > 0)) {
    throw new RangeError(`${label} miterLimit must be positive.`);
  }
  return value;
}

export function resolveStrokeDetails(request = {}) {
  if (!isPlainObject(request)) {
    throw new TypeError("Stroke style details must be a plain object.");
  }
  return freezeOwned({
    lineCap: request.lineCap === undefined
      ? DEFAULT_LINE_CAP
      : validateLineCap(request.lineCap),
    lineJoin: request.lineJoin === undefined
      ? DEFAULT_LINE_JOIN
      : validateLineJoin(request.lineJoin),
    miterLimit: request.miterLimit === undefined
      ? DEFAULT_MITER_LIMIT
      : validateMiterLimit(request.miterLimit)
  });
}

export function requestedStrokeDetails(request = {}, label = "Stroke style") {
  if (!isPlainObject(request)) {
    throw new TypeError(`${label} details must be a plain object.`);
  }
  const result = {};
  if (Object.hasOwn(request, "lineCap")) {
    result.lineCap = validateLineCap(request.lineCap, label);
  }
  if (Object.hasOwn(request, "lineJoin")) {
    result.lineJoin = validateLineJoin(request.lineJoin, label);
  }
  if (Object.hasOwn(request, "miterLimit")) {
    result.miterLimit = validateMiterLimit(request.miterLimit, label);
  }
  return freezeOwned(result);
}
