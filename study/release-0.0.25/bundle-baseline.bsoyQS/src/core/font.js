export const DEFAULT_FONT_FAMILY = "sans-serif";

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
