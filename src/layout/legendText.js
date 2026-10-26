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

// Align inside each existing label column. Samples and ticks keep their anchors.
export function alignLegendLabels(positions, texts, style, profile) {
  if (style.align === undefined) return positions;
  const columns = new Map();
  const keys = positions.map(position => `${position.x}:${position.align ?? "left"}`);
  positions.forEach((position, index) => {
    const text = resolveLegendTitleText(texts[index], style, profile);
    const shift = position.align === "right" ? text.width : position.align === "center" ? text.width / 2 : 0;
    const left = position.x - shift, right = left + text.width;
    const previous = columns.get(keys[index]);
    columns.set(keys[index], { left: Math.min(previous?.left ?? left, left), right: Math.max(previous?.right ?? right, right) });
  });
  return positions.map((position, index) => {
    const column = columns.get(keys[index]);
    return { ...position, x: style.align === "left" ? column.left : style.align === "right" ? column.right : (column.left + column.right) / 2, align: style.align };
  });
}
