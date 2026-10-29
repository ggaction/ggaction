import { ownRecord } from "../core/ownData.js";
import { validateKeys, validateNonNegativeFinite } from "../core/validation.js";
import { parsePaintColor } from "./color.js";

export const MARK_OUTLINE_TYPES = Object.freeze(["point", "bar", "rect", "area", "arc", "text"]);

// One closed authoring/concrete outline value. A false authoring patch removes
// the effect; concrete graphics omit the property instead of storing false.
export function normalizeMarkOutline(value, label = "Mark outline") {
  if (value === false) return false;
  ownRecord(value, label);
  validateKeys(value, ["color", "width"], label);
  if (!Object.hasOwn(value, "color") || !Object.hasOwn(value, "width")) {
    throw new TypeError(`${label} requires color and width.`);
  }
  parsePaintColor(value.color);
  const width = validateNonNegativeFinite(value.width, `${label} width`);
  return Object.freeze({ color: value.color, width });
}

export function requestedMarkOutline(options, label = "Mark") {
  ownRecord(options, label);
  if (!Object.hasOwn(options, "outline")) return {};
  const outline = normalizeMarkOutline(options.outline, `${label} outline`);
  if (outline !== false && Object.hasOwn(options, "stroke") && options.stroke !== false) {
    throw new Error(`${label} cannot specify stroke and outline together.`);
  }
  return { outline };
}
