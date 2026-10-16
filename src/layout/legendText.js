import { resolveTextBounds, resolveTextLines } from "../core/textMetrics.js";

// Hard breaks belong to concrete layout, never to a rendering backend.
export function resolveLegendTitleText(text, style, profile) {
  const lines = resolveTextLines(String(text), {
    fontSize: style.fontSize, align: "left", baseline: "middle",
    blockAlign: "middle"
  });
  const multiple = lines.length > 1 ? lines : undefined;
  const bounds = resolveTextBounds({ x: 0, y: 0, text: String(text),
    ...style, lines: multiple, textAlign: "left", textBaseline: "middle"
  }, profile);
  return { lines: multiple, width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
    extraHeight: bounds.bottom - bounds.top - style.fontSize };
}
