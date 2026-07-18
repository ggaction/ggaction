import { cloneAndFreeze } from "../../core/immutable.js";
import { POINT_SHAPES } from "../pointShapes.js";
import { normalizeStrokeDashPattern } from "./appearance.js";

export function validateScaleUnknown(channel, value) {
  if (["x", "y", "xOffset", "yOffset"].includes(channel)) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Scale unknown for ${channel} must be a finite number.`);
    }
    return value;
  }
  if (channel === "color") {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("Scale unknown for color must be a non-empty color string.");
    }
    return value;
  }
  if (channel === "size") {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        "Scale unknown for size must be a non-negative finite area."
      );
    }
    return value;
  }
  if (channel === "opacity") {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError("Scale unknown for opacity must be between 0 and 1.");
    }
    return value;
  }
  if (channel === "shape") {
    if (!POINT_SHAPES.includes(value)) {
      throw new Error(`Unsupported scale unknown shape "${value}".`);
    }
    return value;
  }
  if (channel === "strokeDash") {
    return cloneAndFreeze(normalizeStrokeDashPattern(value));
  }
  throw new Error(`Scale unknown is not supported for channel "${channel}".`);
}

export function withScaleUnknown(target, source, channel) {
  if (!Object.hasOwn(source, "unknown")) return target;
  return {
    ...target,
    unknown: validateScaleUnknown(channel, source.unknown)
  };
}
