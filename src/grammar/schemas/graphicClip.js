import { validatePathCommands, validatePathFillRule } from "../pathCommands.js";
import { resolvePathCommandBounds } from "../pathGeometry.js";
import { isPlainObject } from "../../core/immutable.js";

// A named owner's clip uses its existing parent frame; it never rebases items.
export function validateGraphicClip(value, type) {
  if (type === "canvas") throw new Error("Canvas uses its existing viewport, not an owner clip.");
  if (!isPlainObject(value) || !Reflect.ownKeys(value).every(key =>
    typeof key === "string" && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), "value"))) {
    throw new TypeError("Graphic clip requires a plain object with data properties.");
  }
  if (isPlainObject(value) && value.type === "path") {
    const keys = Reflect.ownKeys(value);
    if (!keys.every(key => ["type", "commands", "fillRule"].includes(key) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), "value")) ||
        !Object.hasOwn(value, "commands")) throw new TypeError("Path clip requires commands and optional fillRule only.");
    validatePathCommands(value.commands);
    if (Object.hasOwn(value, "fillRule")) validatePathFillRule(value.fillRule);
    return value;
  }
  if (!isPlainObject(value) || Object.keys(value).length !== 4 ||
      !["x", "y", "width", "height"].every(key => Object.hasOwn(value, key) && Number.isFinite(value[key])) ||
      value.width < 0 || value.height < 0 ||
      !Number.isFinite(value.x + value.width) || !Number.isFinite(value.y + value.height)) {
    throw new TypeError("Graphic clip requires finite x, y and non-negative width, height.");
  }
  return value;
}

export function graphicClipBounds(rect, x = 0, y = 0) {
  if (rect.type === "path") {
    const bounds = resolvePathCommandBounds(rect.commands);
    return {left: bounds.left + x, right: bounds.right + x, top: bounds.top + y, bottom: bounds.bottom + y};
  }
  return {left: x + rect.x, right: x + rect.x + rect.width,
    top: y + rect.y, bottom: y + rect.y + rect.height};
}

export function intersectClipBounds(a, b) {
  return {left: Math.max(a.left, b.left), right: Math.min(a.right, b.right),
    top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom)};
}

export function translateGraphicClip(clip, dx, dy) {
  if (clip.type !== "path") return { ...clip, x: clip.x + dx, y: clip.y + dy };
  return { ...clip, commands: clip.commands.map(command => {
    const result = { ...command };
    for (const key of ["x", "x1", "x2"]) if (key in result) result[key] += dx;
    for (const key of ["y", "y1", "y2"]) if (key in result) result[key] += dy;
    return result;
  }) };
}
