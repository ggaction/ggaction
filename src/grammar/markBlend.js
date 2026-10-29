import { ownRecord } from "../core/ownData.js";
import { isBlendMode } from "./compositing.js";

export const MARK_BLEND_TYPES = Object.freeze([
  "point", "bar", "rect", "area", "arc", "text", "line", "rule", "tick"
]);

export function validateMarkBlend(value, type) {
  if (!MARK_BLEND_TYPES.includes(type)) throw new TypeError(`Mark type "${type}" does not support blend.`);
  if (!isBlendMode(value)) throw new TypeError("Mark blend must be normal, multiply, screen, or difference.");
  return value;
}

export function validateRequestedMarkBlend(options, type) {
  ownRecord(options, "Mark options");
  if (Object.hasOwn(options, "blend")) validateMarkBlend(options.blend, type);
}
