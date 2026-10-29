import { normalizeMarkOutline, requestedMarkOutline } from "./markOutline.js";
import { normalizeMarkShadow } from "./markShadow.js";

export const MARK_EFFECT_PROPERTIES = Object.freeze(["outline", "shadow"]);

// Resource plots reuse the same closed effects as ordinary marks. Stored styles
// may retain their ordinary stroke beneath an active outline for exact removal.
export function normalizeMarkEffects(style, label, stored = false) {
  const result = {};
  if (Object.hasOwn(style, "outline")) Object.assign(result, stored
    ? { outline: normalizeMarkOutline(style.outline, `${label} outline`) }
    : requestedMarkOutline(style, label));
  if (Object.hasOwn(style, "shadow")) {
    result.shadow = normalizeMarkShadow(style.shadow, `${label} shadow`);
    if (stored && result.shadow !== false && Object.keys(result.shadow).some(key => !Object.hasOwn(style.shadow, key))) {
      throw new TypeError(`${label} shadow requires resolved offsets and blurRadius.`);
    }
  }
  return result;
}
