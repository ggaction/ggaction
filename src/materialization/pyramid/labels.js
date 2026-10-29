import { wrapText } from "../../layout/text.js";
import { measureTextWidth, resolveTextLines } from "../../core/textMetrics.js";

const INSET = 4;
function fit(text, style, width, height, profile) {
  if (width <= 0 || height < style.fontSize) return undefined;
  const parts = wrapText(text, { maxWidth: width, mode: "word", style, profile });
  if (parts.length === 0) parts.push("");
  const blockHeight = style.fontSize + (parts.length - 1) * style.fontSize * 1.2;
  if (blockHeight > height || parts.some(part => measureTextWidth(part, style, profile) > width)) return undefined;
  const lines = resolveTextLines(parts.join("\n"), { fontSize: style.fontSize, baseline: "middle", align: "center", blockAlign: "middle" });
  return { height: blockHeight, ...(parts.length > 1 || parts[0] !== text ? { lines } : {}) };
}

// Text wrapping and metrics have one existing owner. The stage contributes only
// its inscribed rectangle and an unoccupied outside lane; it never changes data.
export function pyramidLabelProperties(item, frame, orientation, text, style, profile) {
  const vertical = orientation === "down" || orientation === "up";
  const narrow = Math.min(item.topWidth, item.bottomWidth);
  const x = item.properties.x + item.properties.width / 2;
  const y = item.properties.y + item.properties.height / 2;
  const inside = fit(text, style, (vertical ? narrow : item.stageLength) - 2 * INSET,
    (vertical ? item.stageLength : narrow) - 2 * INSET, profile);
  if (inside !== undefined) return { x, y, text, ...style, textAlign: "center", textBaseline: "middle", ...(inside.lines ? { lines: inside.lines } : {}) };
  const outsideX = item.properties.x + item.properties.width + INSET;
  const outsideY = item.properties.y + item.properties.height + INSET;
  const outside = fit(text, style, vertical ? frame.x + frame.width - INSET - outsideX : item.stageLength - 2 * INSET,
    vertical ? item.stageLength - 2 * INSET : frame.y + frame.height - INSET - outsideY, profile);
  if (outside === undefined) throw new RangeError("Pyramid label cannot fit inside its stage or outside viewport lane; increase Canvas size, reduce label fontSize or use labels:false.");
  return { x: vertical ? outsideX : x, y: vertical ? y : outsideY + outside.height / 2,
    text, ...style, textAlign: vertical ? "left" : "center", textBaseline: "middle", ...(outside.lines ? { lines: outside.lines } : {}) };
}
