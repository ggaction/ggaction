import { FONT_IDENTITY_KEYS, validateFontIdentity } from "../core/font.js";
import { isOwned } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { readAssetPayloadBytes } from "./assetPayload.js";

const signatures = Object.freeze({
  "font/ttf": [0, 1, 0, 0],
  "font/otf": [79, 84, 84, 79],
  "font/woff": [119, 79, 70, 70],
  "font/woff2": [119, 79, 70, 50]
});
export const FONT_MIME_TYPES = Object.freeze(Object.keys(signatures));
const keys = ["contentHash", "mimeType", "byteLength", "payload", ...FONT_IDENTITY_KEYS];
const validated = new WeakMap();

export function matchesFontMime(bytes, mimeType) {
  return signatures[mimeType]?.every((byte, index) => bytes[index] === byte) ?? false;
}

function readBytes(font) {
  const cached = validated.get(font);
  if (cached !== undefined) return cached;
  ownRecord(font, "Concrete font");
  if (Object.keys(font).length !== keys.length || keys.some(key => !Object.hasOwn(font, key))) {
    throw new TypeError("Concrete font requires its exact fields.");
  }
  validateFontIdentity(font);
  const bytes = readAssetPayloadBytes(font, FONT_MIME_TYPES, "Font");
  if (!matchesFontMime(bytes, font.mimeType)) throw new TypeError("Font bytes do not match their MIME.");
  // Signature and hash checks establish stored-byte identity, not valid glyphs.
  // The explicit host decoder remains responsible for complete font decoding.
  if (isOwned(font)) validated.set(font, bytes);
  return bytes;
}

export function validateFontPayload(font) {
  readBytes(font);
  return font;
}

export function fontPayloadBytes(font) {
  return new Uint8Array(readBytes(font));
}
