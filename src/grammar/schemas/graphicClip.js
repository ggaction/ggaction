import { isPlainObject } from "../../core/immutable.js";

// A named owner's rectangle uses its existing parent frame; it never rebases items.
export function validateGraphicClip(value, type) {
  if (type === "canvas") throw new Error("Canvas uses its existing viewport, not an owner clip.");
  if (!isPlainObject(value) || Object.keys(value).length !== 4 ||
      !["x", "y", "width", "height"].every(key => Object.hasOwn(value, key) && Number.isFinite(value[key])) ||
      value.width < 0 || value.height < 0 ||
      !Number.isFinite(value.x + value.width) || !Number.isFinite(value.y + value.height)) {
    throw new TypeError("Graphic clip requires finite x, y and non-negative width, height.");
  }
  return value;
}

export function graphicClipBounds(rect, x = 0, y = 0) {
  return {left: x + rect.x, right: x + rect.x + rect.width,
    top: y + rect.y, bottom: y + rect.y + rect.height};
}

export function intersectClipBounds(a, b) {
  return {left: Math.max(a.left, b.left), right: Math.min(a.right, b.right),
    top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom)};
}
