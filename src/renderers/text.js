export { normalizeRendererFontWeight } from "../core/font.js";

// Keep authored families first, followed by one shared fallback order.
// Canvas ignores unavailable families; native adapters can filter that list.
// This resolves font resources only; no text or layout enters program state.
const SYSTEM_FALLBACKS = Object.freeze([
  "Noto Sans CJK KR", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic",
  "Noto Sans CJK JP", "Noto Sans JP", "Yu Gothic", "Meiryo",
  "Noto Sans CJK SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei",
  "Noto Sans CJK TC", "PingFang TC", "Microsoft JhengHei",
  "Arial Unicode MS", "Noto Sans", "DejaVu Sans",
  "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji"
]);

export function rendererFontFamily(requested, installed) {
  const present = new Set(requested.split(",").map(family => family.trim().replace(/^["']|["']$/g, "").toLowerCase()));
  const extra = SYSTEM_FALLBACKS.filter(family => (installed === undefined || installed.has(family)) && !present.has(family.toLowerCase()));
  return [requested, ...extra.map(family => `"${family}"`)].join(", ");
}
