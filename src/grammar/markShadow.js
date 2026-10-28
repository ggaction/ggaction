import { ownRecord } from "../core/ownData.js";
import { validateKeys, validateNonNegativeFinite } from "../core/validation.js";
import { parsePaintColor } from "./color.js";

export const MARK_SHADOW_TYPES = Object.freeze(["point", "bar", "rect", "area", "arc", "text", "line", "rule", "tick", "image"]);

export function normalizeMarkShadow(value, label = "Mark shadow") {
  if (value === false) return false;
  ownRecord(value, label);
  validateKeys(value, ["color", "offsetX", "offsetY", "blurRadius"], label);
  if (!Object.hasOwn(value, "color")) throw new TypeError(`${label} requires color.`);
  if (Object.values(value).some(entry => entry === undefined)) throw new TypeError(`${label} cannot contain explicit undefined.`);
  const { color, offsetX = 0, offsetY = 0, blurRadius = 0 } = { __proto__: null, ...value };
  parsePaintColor(color);
  if (![offsetX, offsetY].every(Number.isFinite)) throw new TypeError(`${label} offsets require finite numbers.`);
  validateNonNegativeFinite(blurRadius, `${label} blurRadius`);
  return Object.freeze({ color, offsetX: offsetX === 0 ? 0 : offsetX, offsetY: offsetY === 0 ? 0 : offsetY,
    blurRadius: blurRadius === 0 ? 0 : blurRadius });
}

export function requestedMarkShadow(options, label = "Mark") {
  ownRecord(options, label);
  return Object.hasOwn(options, "shadow") ? { shadow: normalizeMarkShadow(options.shadow, `${label} shadow`) } : {};
}
