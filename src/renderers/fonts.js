import { validateFontPayload } from "../grammar/fontPayload.js";
import { contentDigest } from "../core/contentDigest.js";
import { walkGraphicSources } from "../grammar/schemas/graphicSources.js";

export function fontRenderKey(font) {
  return JSON.stringify([font.contentHash, font.family, font.style, font.weight, font.metricsProviderVersion]);
}

export function fontRenderAlias(font) {
  return `ggaction-font-${contentDigest(fontRenderKey(font))}`;
}

export function concreteFonts(graphicSpec) {
  const values = new Map(), hashes = new Set(); let bytes = 0;
  const add = (object, type) => {
    if (type !== "text" || object.properties?.font === undefined) return;
    const font = validateFontPayload(object.properties.font), key = fontRenderKey(font);
    if (values.has(key)) return;
    if (values.size === 64) throw new RangeError("Font rendering exceeds its unique font budget.");
    if (!hashes.has(font.contentHash)) { hashes.add(font.contentHash); bytes += font.byteLength; }
    if (bytes > 64 * 1024 * 1024) throw new RangeError("Font rendering exceeds its unique byte budget.");
    values.set(key, font);
  };
  walkGraphicSources(graphicSpec, (_id, object, type) => add(object, type));
  return values;
}
