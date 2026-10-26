import { isPlainObject, cloneAndFreeze } from "./immutable.js";

export const COMPOSITION_SCALE_CHANNELS = Object.freeze(["x", "y", "color", "stroke", "size", "shape", "opacity", "strokeWidth", "strokeDash"]);

export function normalizeCompositionShares(value = {}) {
  if (!isPlainObject(value)) throw new TypeError("Composition share requires a channel object.");
  for (const [channel, shared] of Object.entries(value)) {
    if (!COMPOSITION_SCALE_CHANNELS.includes(channel)) throw new Error(`Unknown composition share channel "${channel}".`);
    if (typeof shared !== "boolean") throw new TypeError(`Composition share.${channel} must be boolean.`);
  }
  return cloneAndFreeze(value);
}
