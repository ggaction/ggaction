import { ownArray, ownRecord } from "../core/ownData.js";
import { normalizePatternOptions, resolvePatternOrigin } from "./patterns.js";
import { normalizeRadialGradient } from "./radialGradient.js";
import { parsePaintColor } from "./color.js";
import { validateGradientStops } from "./gradientStops.js";
export { validateGradientStops } from "./gradientStops.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { interpolateNumber } from "./numeric.js";

const PAINT_KEYS = Object.freeze(["type", "from", "to", "stops"]);
const POINT_KEYS = Object.freeze(["x", "y"]);

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

export function isLinearGradientPaint(value) {
  return isPlainObject(value) && Object.getOwnPropertyDescriptor(value, "type")?.value === "linear-gradient";
}

export function isPatternPaint(value) {
  return isPlainObject(value) && Object.getOwnPropertyDescriptor(value, "type")?.value === "pattern";
}

export function isRadialGradientPaint(value) {
  return isPlainObject(value) && Object.getOwnPropertyDescriptor(value, "type")?.value === "radial-gradient";
}

function normalizeStructuredPaint(value, label) {
  ownRecord(value, label);
  const { type, ...options } = value;
  if (type === "pattern") return cloneAndFreeze({ type, ...normalizePatternOptions(options) });
  const gradient = normalizeRadialGradient(options);
  validateUnitPoint(gradient.center, "Radial gradient center");
  validateUnitPoint(gradient.focal, "Radial gradient focal");
  gradient.stops.forEach(stop => parsePaintColor(stop.color));
  return cloneAndFreeze({ type, ...gradient });
}

export function validateFillPaint(value, label = "fill") {
  if (typeof value === "string") {
    if (value.length === 0) throw new TypeError(`${label} must be a non-empty string or linear gradient.`);
    return value;
  }
  if (isPlainObject(value)) {
    ownRecord(value, label);
    if (isPatternPaint(value) || isRadialGradientPaint(value)) return normalizeStructuredPaint(value, label);
  }
  if (!isPlainObject(value) || !hasExactKeys(value, PAINT_KEYS)) {
    throw new TypeError(`${label} must be a non-empty string or linear gradient.`);
  }
  if (value.type !== "linear-gradient") {
    throw new Error(`Unsupported fill paint type "${value.type}".`);
  }
  ownRecord(value.from, "Linear gradient from");
  ownRecord(value.to, "Linear gradient to");
  ownArray(value.stops, "Linear gradient stops");
  value.stops.forEach((stop, index) => ownRecord(stop, `Linear gradient stops[${index}]`));
  validateUnitPoint(value.from, "Linear gradient from");
  validateUnitPoint(value.to, "Linear gradient to");
  if (value.from.x === value.to.x && value.from.y === value.to.y) {
    throw new Error("Linear gradient from and to must differ.");
  }
  validateGradientStops(value.stops);
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

const CONCRETE_PATTERN_KEYS = Object.freeze([
  "type", "style", "pitch", "strokeWidth", "phase", "foreground", "background", "origin"
]);

export function validateConcreteFillPaint(value, label = "fill") {
  if (!isPatternPaint(value)) {
    const normalized = validateFillPaint(value, label);
    if (isRadialGradientPaint(value) && !Object.hasOwn(value, "focal")) {
      throw new TypeError("Concrete radial fill requires an explicit focal point.");
    }
    return normalized;
  }
  ownRecord(value, label);
  if (!hasExactKeys(value, CONCRETE_PATTERN_KEYS)) {
    throw new TypeError("Concrete pattern fill requires normalized options and an explicit origin.");
  }
  ownRecord(value.origin, "Pattern origin");
  if (!hasExactKeys(value.origin, POINT_KEYS) || !Object.values(value.origin).every(Number.isFinite)) {
    throw new TypeError("Pattern origin requires finite { x, y } coordinates.");
  }
  const { type, origin, ...options } = value;
  const normalized = normalizePatternOptions(options);
  if (normalized.phase.some((component, index) => component !== value.phase[index])) {
    throw new TypeError("Concrete pattern phase must already be normalized.");
  }
  return value;
}

// Explicit materialization inputs only. Plot identity is resolved by the caller.
export function resolveFillPaint(value, { bounds, plotOrigin } = {}) {
  const paint = validateFillPaint(value);
  if (!isPatternPaint(paint)) return paint;
  ownRecord(bounds, "Pattern bounds");
  if (!["left", "right", "top", "bottom"].every(key => Object.hasOwn(bounds, key)) ||
      ![bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite) ||
      bounds.left > bounds.right || bounds.top > bounds.bottom) {
    throw new TypeError("Pattern bounds must be finite and ordered.");
  }
  const { type, coordinateSpace, ...options } = paint;
  const origin = resolvePatternOrigin({ ...options, coordinateSpace }, {
    object: [bounds.left, bounds.top], ...(plotOrigin === undefined ? {} : { plot: plotOrigin })
  });
  return cloneAndFreeze({ type, ...options, origin: { x: origin[0], y: origin[1] } });
}

export function translateFillPaint(fill, dx, dy) {
  if (!isPatternPaint(fill) || dx === 0 && dy === 0) return fill;
  validateConcreteFillPaint(fill);
  const origin = { x: fill.origin.x + dx, y: fill.origin.y + dy };
  if (!Object.values(origin).every(Number.isFinite)) throw new RangeError("Translated pattern origin must remain finite.");
  return cloneAndFreeze({ ...fill, origin });
}
