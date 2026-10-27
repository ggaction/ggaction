import { isPlainObject } from "../core/immutable.js";
import { interpolateNumber } from "./numeric.js";

const PAINT_KEYS = Object.freeze(["type", "from", "to", "stops"]);
const POINT_KEYS = Object.freeze(["x", "y"]);
const STOP_KEYS = Object.freeze(["offset", "color"]);

function hasExactKeys(value, keys) {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function validateUnitPoint(value, label) {
  if (!isPlainObject(value) || !hasExactKeys(value, POINT_KEYS)) {
    throw new TypeError(`${label} must be a plain { x, y } object.`);
  }
  for (const key of POINT_KEYS) {
    if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1) {
      throw new RangeError(`${label}.${key} must be a finite number from 0 to 1.`);
    }
  }
}

function validateStop(stop, index) {
  const label = `Linear gradient stops[${index}]`;
  if (!isPlainObject(stop) || !hasExactKeys(stop, STOP_KEYS)) {
    throw new TypeError(`${label} must be a plain { offset, color } object.`);
  }
  if (!Number.isFinite(stop.offset) || stop.offset < 0 || stop.offset > 1) {
    throw new RangeError(`${label}.offset must be a finite number from 0 to 1.`);
  }
  if (typeof stop.color !== "string" || stop.color.length === 0) {
    throw new TypeError(`${label}.color must be a non-empty string.`);
  }
}

export function isLinearGradientPaint(value) {
  return isPlainObject(value) && value.type === "linear-gradient";
}

export function validateFillPaint(value, label = "fill") {
  if (typeof value === "string") {
    if (value.length === 0) throw new TypeError(`${label} must be a non-empty string or linear gradient.`);
    return value;
  }
  if (!isPlainObject(value) || !hasExactKeys(value, PAINT_KEYS)) {
    throw new TypeError(`${label} must be a non-empty string or linear gradient.`);
  }
  if (value.type !== "linear-gradient") {
    throw new Error(`Unsupported fill paint type "${value.type}".`);
  }
  validateUnitPoint(value.from, "Linear gradient from");
  validateUnitPoint(value.to, "Linear gradient to");
  if (value.from.x === value.to.x && value.from.y === value.to.y) {
    throw new Error("Linear gradient from and to must differ.");
  }
  if (!Array.isArray(value.stops) || value.stops.length < 2) {
    throw new TypeError("Linear gradient stops must contain at least two entries.");
  }
  value.stops.forEach(validateStop);
  for (let index = 1; index < value.stops.length; index += 1) {
    if (value.stops[index].offset < value.stops[index - 1].offset) {
      throw new Error("Linear gradient stop offsets must be nondecreasing.");
    }
  }
  return value;
}

export function resolveLinearGradientCoordinates(paint, bounds) {
  validateFillPaint(paint, "Linear gradient paint");
  if (!isLinearGradientPaint(paint)) {
    throw new TypeError("Linear gradient coordinates require a structured paint.");
  }
  if (
    !isPlainObject(bounds) ||
    ![bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite) ||
    bounds.left > bounds.right ||
    bounds.top > bounds.bottom
  ) {
    throw new TypeError("Linear gradient bounds must be finite and ordered.");
  }
  const point = value => Object.freeze({
    x: interpolateNumber(bounds.left, bounds.right, value.x),
    y: interpolateNumber(bounds.top, bounds.bottom, value.y)
  });
  return Object.freeze({ from: point(paint.from), to: point(paint.to) });
}
