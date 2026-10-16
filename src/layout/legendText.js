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

// Explicit text alignment is internal to one measured content block. Omission
// returns the original anchor object to preserve every native family default.
export function alignLegendTitle(title, text, style, bodyBounds, profile) {
  if (style.align === undefined) return title;
  const measured = resolveLegendTitleText(text, style, profile);
  const old = resolveTextBounds({ x: title.x, y: title.y, text,
    ...style, lines: measured.lines, textAlign: title.align, textBaseline: "middle"
  }, profile);
  const left = Math.min(old.left, ...bodyBounds.map(bounds => bounds.left));
  const right = Math.max(old.right, ...bodyBounds.map(bounds => bounds.right));
  return { ...title, x: style.align === "left" ? left : style.align === "right" ? right : (left + right) / 2,
    align: style.align };
}
