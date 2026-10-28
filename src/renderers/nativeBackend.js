import { prepareImageRendering } from "./imageRendering.js";

export async function loadNativeBackend() {
  try {
    return await import("@napi-rs/canvas");
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && error.message.includes("@napi-rs/canvas")) {
      throw new Error("PNG/PDF output requires @napi-rs/canvas. Install it with: npm install ggaction @napi-rs/canvas", { cause: error });
    }
    throw error;
  }
}

// Supply installed glyph fallbacks after the authored family, as browsers do.
// This resolves font resources only; no text or layout enters program state.
const SYSTEM_FALLBACKS = [
  "Noto Sans CJK KR", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic",
  "Noto Sans CJK JP", "Noto Sans JP", "Yu Gothic", "Meiryo",
  "Noto Sans CJK SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei",
  "Noto Sans CJK TC", "PingFang TC", "Microsoft JhengHei",
  "Arial Unicode MS", "Noto Sans", "DejaVu Sans",
  "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji"
];

export function nativeFontResolver(globalFonts) {
  const installed = new Set(globalFonts.families.map(entry => entry.family));
  const fallbacks = SYSTEM_FALLBACKS.filter(family => installed.has(family));
  const cache = new Map();
  return requested => {
    if (cache.has(requested)) return cache.get(requested);
    const present = new Set(requested.split(',').map(family => family.trim().replace(/^["']|["']$/g, '').toLowerCase()));
    const extra = fallbacks.filter(family => !present.has(family.toLowerCase()));
    const resolved = [requested, ...extra.map(family => `"${family}"`)].join(', ');
    cache.set(requested, resolved);
    return resolved;
  };
}

export function prepareNativeImages(program, loadImage) {
  return prepareImageRendering(program, { decode: async ({ bytes }) => {
    const image = await loadImage(bytes);
    return { image, width: image.width, height: image.height, originClean: true };
  } });
}
