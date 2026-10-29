import { ownRecord } from "./ownData.js";

export const DEFAULT_FONT_FAMILY = "sans-serif";
export const FONT_IDENTITY_KEYS = Object.freeze(["family", "style", "weight", "metricsProviderVersion"]);

export function validateFontIdentity(value) {
  ownRecord(value, "Font identity");
  if (FONT_IDENTITY_KEYS.some(key => !Object.hasOwn(value, key))) throw new TypeError("Font identity requires all own fields.");
  for (const key of ["family", "metricsProviderVersion"]) {
    if (typeof value[key] !== "string" || !value[key].trim()) throw new TypeError(`Font ${key} must be a nonempty string.`);
  }
  validateFontStyle(value.style, "Font");
  if (!Number.isInteger(value.weight) || value.weight < 100 || value.weight > 900 || value.weight % 100 !== 0) {
    throw new RangeError("Font weight must be 100–900 in steps of 100.");
  }
  return value;
}

export function normalizeRendererFontWeight(fontWeight) {
  if (typeof fontWeight !== "number") return fontWeight;
  return Math.min(900, Math.max(100, Math.round(fontWeight / 100) * 100));
}

export function validateFontStyle(value, label = "Text") {
  if (!["normal", "italic"].includes(value)) {
    throw new Error(`${label} fontStyle must be normal or italic.`);
  }
  return value;
}

export function textMetricKey({ text, fontFamily, fontSize, fontWeight, fontStyle = "normal" }) {
  return JSON.stringify([text, fontFamily, fontSize, fontWeight, fontStyle]);
}

export function textMetricFontWeight(value = "normal") {
  if (typeof value === "number") return normalizeRendererFontWeight(value);
  if (value === "normal") return 400;
  if (value === "bold") return 700;
  if (/^[1-9]00$/u.test(value)) return Number(value);
  return undefined;
}
