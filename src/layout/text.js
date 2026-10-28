import { measureTextWidth } from "../core/textMetrics.js";

export {
  measureTextWidth,
  resolveTextBounds
} from "../core/textMetrics.js";

const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

function wrapGraphemes(text, maxWidth, style, profile) {
  const lines = [];
  let line = "";
  for (const { segment } of graphemeSegmenter.segment(text)) {
    const candidate = line + segment;
    if (line !== "" && measureTextWidth(candidate, style, profile) > maxWidth) {
      lines.push(line);
      line = segment;
    } else {
      line = candidate;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

function wrapWords(text, maxWidth, style, profile) {
  const lines = [];
  let line = "";
  for (const word of text.trim().split(/\s+/u)) {
    if (measureTextWidth(word, style, profile) > maxWidth) {
      if (line !== "") {
        lines.push(line);
        line = "";
      }
      const fragments = wrapGraphemes(word, maxWidth, style, profile);
      lines.push(...fragments.slice(0, -1));
      line = fragments.at(-1);
      continue;
    }
    const candidate = line === "" ? word : `${line} ${word}`;
    if (line !== "" && measureTextWidth(candidate, style, profile) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

export function wrapText(text, {
  maxWidth,
  mode = "word",
  style,
  profile
} = {}) {
  if (maxWidth === undefined) return [text];
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    throw new RangeError("Text maxWidth must be positive.");
  }
  if (!["word", "character"].includes(mode)) {
    throw new Error(`Unsupported text wrap mode "${mode}".`);
  }
  const wrapLine = line => mode === "word"
    ? wrapWords(line, maxWidth, style, profile)
    : wrapGraphemes(line, maxWidth, style, profile);
  const hardLines = text.split(/\r\n|\r|\n/u);
  return hardLines.length === 1 ? wrapLine(text)
    : hardLines.flatMap(line => line === "" ? [""] : wrapLine(line));
}
