import { annotateError } from "../core/diagnostics.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite,
  validateOptionObject
} from "../core/validation.js";

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
  validateNonNegativeFinite(value, `Canvas margin.${key}`);
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
  validatePositiveFinite(width, "Canvas width");
  validatePositiveFinite(height, "Canvas height");

  validateNonEmptyString(background, "Canvas background");

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

export function resolveGraphicBounds(program) {
  const canvas = program.graphicSpec.objects.canvas;
  const margin = program.materializationConfigs.canvas?.margin;
  if (
    canvas?.type !== "canvas" ||
    !Number.isFinite(canvas.properties.width) ||
    !Number.isFinite(canvas.properties.height) ||
    margin === undefined
  ) {
    throw new Error("Graphical layout requires Canvas dimensions and margin.");
  }
  return createGraphicBounds({
    width: canvas.properties.width,
    height: canvas.properties.height,
    margin
  });
}


// Structured measurements let explicit layout policies retry a domain action.
// Invalid geometry is deliberately not recoverable by allocating more margin.
export function resolveCanvasOverflow(bounds, canvas) {
  if (!canvas || ![canvas.width, canvas.height].every(value => Number.isFinite(value) && value > 0) ||
    !Array.isArray(bounds) || bounds.some(item => !item ||
      ![item.left, item.right, item.top, item.bottom].every(Number.isFinite) ||
      item.left > item.right || item.top > item.bottom)) return undefined;
  const overflow = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const item of bounds) {
    overflow.top = Math.max(overflow.top, -item.top);
    overflow.right = Math.max(overflow.right, item.right - canvas.width);
    overflow.bottom = Math.max(overflow.bottom, item.bottom - canvas.height);
    overflow.left = Math.max(overflow.left, -item.left);
  }
  return Object.values(overflow).some(value => value > 1e-9)
    ? cloneAndFreeze(overflow) : undefined;
}

export function canvasOverflowError(message, bounds, canvas) {
  const error = new Error(message);
  const overflow = resolveCanvasOverflow(bounds, canvas);
  return overflow === undefined ? error : annotateError(error, {
    reason: "canvas-overflow", canvasOverflow: overflow
  });
}

// Exact inner dimensions opt in to domain-owned automatic guide margins.
export function resolveCanvasPlot(args, previous) {
  const plot = Object.hasOwn(args, "plot") ? args.plot : previous;
  if (plot === undefined || plot === false) return undefined;
  validateOptionObject(plot, ["width", "height"], "Canvas plot");
  validatePositiveFinite(plot.width, "Canvas plot width");
  validatePositiveFinite(plot.height, "Canvas plot height");
  if (Object.hasOwn(args, "width") || Object.hasOwn(args, "height")) {
    throw new Error("Canvas plot dimensions cannot be combined with fixed outer dimensions.");
  }
  return cloneAndFreeze(plot);
}
