import { measureTextWidth, resolveTextLines } from "../../core/textMetrics.js";
import { wrapText } from "../../layout/text.js";

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
function shorten(text, width, style, profile) {
  const ellipsis = "…";
  if (measureTextWidth(ellipsis, style, profile) > width) throw new RangeError("Table cell cannot fit its truncation indicator; increase column width or reduce padding/fontSize.");
  const segments = Array.from(segmenter.segment(text), item => item.segment);
  let low = 0, high = segments.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (measureTextWidth(segments.slice(0, middle).join("") + ellipsis, style, profile) <= width) low = middle;
    else high = middle - 1;
  }
  return segments.slice(0, low).join("") + ellipsis;
}

// The full accessible value remains with the semantic cell. Concrete Text
// contains exactly the visible lines, never an invisible overflowing string.
export function tableTextProperties(text, bounds, column, style, padding, profile) {
  if (text === "") return { truncated: false };
  const width = bounds.right - bounds.left - 2 * padding;
  const height = bounds.bottom - bounds.top - 2 * padding;
  if (width <= 0 || height < style.fontSize) throw new RangeError("Table text requires positive content width and a rowHeight that fits its fontSize.");
  const lines = column.wrap === false ? text.split(/\r\n|\r|\n/u) : wrapText(text, { maxWidth: width, mode: column.wrap, style, profile });
  const maxLines = 1 + Math.floor((height - style.fontSize) / (style.fontSize * 1.2));
  const visible = lines.slice(0, maxLines);
  let truncated = lines.length > maxLines;
  for (let index = 0; index < visible.length; index++) {
    const overflow = measureTextWidth(visible[index], style, profile) > width;
    if (overflow || truncated && index === visible.length - 1) {
      visible[index] = shorten(visible[index], width, style, profile);
      truncated = true;
    }
  }
  const textAlign = column.align;
  const x = textAlign === "left" ? bounds.left + padding : textAlign === "right" ? bounds.right - padding : (bounds.left + bounds.right) / 2;
  return { truncated, properties: { ...style, text: visible.join("\n"), x, y: (bounds.top + bounds.bottom) / 2,
    textAlign, textBaseline: "middle", ...(visible.length > 1 ? { lines: resolveTextLines(visible.join("\n"), {
      fontSize: style.fontSize, baseline: "middle", align: textAlign, blockAlign: "middle"
    }) } : {}) } };
}
