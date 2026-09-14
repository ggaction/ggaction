export const DEFAULT_FONT_FAMILY = "sans-serif";

export function normalizeRendererFontWeight(fontWeight) {
  if (typeof fontWeight !== "number") return fontWeight;
  return Math.min(900, Math.max(100, Math.round(fontWeight / 100) * 100));
}

export function textMetricKey({ text, fontFamily, fontSize, fontWeight }) {
  return JSON.stringify([text, fontFamily, fontSize, fontWeight]);
}

export function textMetricFontWeight(value = "normal") {
  if (typeof value === "number") return normalizeRendererFontWeight(value);
  if (value === "normal") return 400;
  if (value === "bold") return 700;
  if (/^[1-9]00$/u.test(value)) return Number(value);
  return undefined;
}
