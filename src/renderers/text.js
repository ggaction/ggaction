const MIN_RENDERER_NUMERIC_FONT_WEIGHT = 100;
const MAX_RENDERER_NUMERIC_FONT_WEIGHT = 900;

export function normalizeRendererFontWeight(fontWeight) {
  if (typeof fontWeight !== "number") return fontWeight;
  const rounded = Math.round(fontWeight / 100) * 100;
  return Math.min(
    MAX_RENDERER_NUMERIC_FONT_WEIGHT,
    Math.max(MIN_RENDERER_NUMERIC_FONT_WEIGHT, rounded)
  );
}
