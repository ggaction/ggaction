import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const MARGIN_KEYS = Object.freeze(["top", "right", "bottom", "left"]);

export const DEFAULT_MARGIN = cloneAndFreeze({
  top: 30,
  right: 30,
  bottom: 60,
  left: 70
});

export const DEFAULT_CANVAS = cloneAndFreeze({
  width: 640,
  height: 400,
  background: "white",
  margin: DEFAULT_MARGIN
});

function validateMarginValue(value, key) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`Canvas margin.${key} must be a non-negative number.`);
  }
}

export function normalizeMargin(margin, base = DEFAULT_MARGIN) {
  if (Number.isFinite(margin)) {
    if (margin < 0) {
      throw new RangeError("Canvas margin must not be negative.");
    }

    return cloneAndFreeze({
      top: margin,
      right: margin,
      bottom: margin,
      left: margin
    });
  }

  if (!isPlainObject(margin)) {
    throw new TypeError("Canvas margin must be a number or a plain object.");
  }

  const keys = Object.keys(margin);

  if (keys.length === 0) {
    throw new TypeError("Canvas margin object must contain at least one side.");
  }

  for (const key of keys) {
    if (!MARGIN_KEYS.includes(key)) {
      throw new Error(`Unknown canvas margin option "${key}".`);
    }

    validateMarginValue(margin[key], key);
  }

  return cloneAndFreeze({
    ...base,
    ...margin
  });
}

export function validateCanvasState({ width, height, background, margin }) {
  if (!Number.isInteger(width) || width <= 0) {
    throw new RangeError("Canvas width must be a positive integer.");
  }

  if (!Number.isInteger(height) || height <= 0) {
    throw new RangeError("Canvas height must be a positive integer.");
  }

  if (typeof background !== "string" || background.length === 0) {
    throw new TypeError("Canvas background must be a non-empty string.");
  }

  for (const key of MARGIN_KEYS) {
    validateMarginValue(margin[key], key);
  }

  if (margin.left + margin.right >= width) {
    throw new RangeError("Canvas horizontal margins must be smaller than width.");
  }

  if (margin.top + margin.bottom >= height) {
    throw new RangeError("Canvas vertical margins must be smaller than height.");
  }
}

export function createGraphicBounds({ width, height, margin }) {
  return cloneAndFreeze({
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  });
}
