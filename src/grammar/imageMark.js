import { normalizeMarkShadow } from "./markShadow.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateGraphicClip } from "./schemas/graphicClip.js";

export const IMAGE_MARK_CONFIG_KEYS = Object.freeze(["viewport", "fit", "align", "opacity", "clip", "shadow"]);
export function imageClipOwner(id) { return `${id}-image-clip`; }
export function imageItemKey(id) { return JSON.stringify([[], id, "item", ["resource", id]]); }

export function normalizeImageMarkConfig(options, previous = {}) {
  ownRecord(options, "Image mark options");
  const value = { viewport: "auto", fit: "contain", align: [0.5, 0.5], opacity: 1, clip: false, ...previous };
  for (const key of IMAGE_MARK_CONFIG_KEYS) if (Object.hasOwn(options, key)) value[key] = options[key];
  if (value.viewport !== "auto") {
    ownRecord(value.viewport, "Image viewport");
    validateGraphicClip(value.viewport, "image");
    if (Object.keys(value.viewport).length !== 4 || !Number.isFinite(value.viewport.width) || !Number.isFinite(value.viewport.height) ||
        value.viewport.width <= 0 || value.viewport.height <= 0) throw new TypeError("Image viewport requires positive width and height.");
  }
  if (!["contain", "cover", "fill"].includes(value.fit)) throw new TypeError("Image fit must be contain, cover, or fill.");
  ownArray(value.align, "Image align");
  if (value.align.length !== 2 || value.align.some(number => !Number.isFinite(number) || number < 0 || number > 1)) throw new TypeError("Image align requires two values in [0, 1].");
  if (!Number.isFinite(value.opacity) || value.opacity < 0 || value.opacity > 1) throw new TypeError("Image opacity must be in [0, 1].");
  if (value.clip !== false) validateGraphicClip(value.clip, "image");
  if (Object.hasOwn(value, "shadow")) value.shadow = normalizeMarkShadow(value.shadow, "Image shadow");
  return cloneAndFreeze(value);
}
