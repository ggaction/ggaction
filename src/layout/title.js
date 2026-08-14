import { measureTextWidth, resolveTextBounds, wrapText } from "./text.js";

function lineCenters(lines, style, lineHeight, start) {
  return lines.map((_, index) => start + style.fontSize / 2 + index * lineHeight);
}

export function buildTitleReadingBlock({ text, subtitle }, config) {
  const titleLines = wrapText(text, {
    maxWidth: config.maxWidth,
    mode: config.wrap,
    style: config.titleStyle
  });
  const subtitleLines = subtitle === undefined ? [] : wrapText(subtitle, {
    maxWidth: config.maxWidth,
    mode: config.wrap,
    style: config.subtitleStyle
  });
  const titleLineHeight = config.lineHeight ?? config.titleStyle.fontSize * 1.2;
  const subtitleLineHeight = config.lineHeight ??
    config.subtitleStyle.fontSize * 1.2;
  const titleCenters = lineCenters(
    titleLines,
    config.titleStyle,
    titleLineHeight,
    0
  );
  const titleBottom = titleCenters.at(-1) + config.titleStyle.fontSize / 2;
  const subtitleStart = titleBottom + (subtitleLines.length === 0 ? 0 : config.gap);
  const subtitleCenters = lineCenters(
    subtitleLines,
    config.subtitleStyle,
    subtitleLineHeight,
    subtitleStart
  );
  const height = subtitleLines.length === 0
    ? titleBottom
    : subtitleCenters.at(-1) + config.subtitleStyle.fontSize / 2;
  const widths = [
    ...titleLines.map(line => measureTextWidth(line, config.titleStyle)),
    ...subtitleLines.map(line => measureTextWidth(line, config.subtitleStyle))
  ];
  return {
    titleLines,
    subtitleLines,
    titleCenters,
    subtitleCenters,
    width: widths.reduce((maximum, width) => Math.max(maximum, width), -Infinity),
    height
  };
}

export function alignedTitleAnchor(start, length, blockLength, align) {
  if (align === "left") return start + blockLength / 2;
  if (align === "center") return start + length / 2;
  return start + length - blockLength / 2;
}

export function alignedTextAnchor(start, length, align) {
  if (align === "left") return start;
  if (align === "center") return start + length / 2;
  return start + length;
}

function axisAlignedTextBounds({ x, y, text, style, align, rotation }) {
  return resolveTextBounds({
    x,
    y,
    text,
    ...style,
    textAlign: align,
    textBaseline: "middle",
    rotation
  });
}

function unionBounds(bounds) {
  return bounds.reduce((union, item) => ({
    left: Math.min(union.left, item.left),
    right: Math.max(union.right, item.right),
    top: Math.min(union.top, item.top),
    bottom: Math.max(union.bottom, item.bottom)
  }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
}

export function resolveTitleComponentBounds(component, style) {
  return unionBounds(component.lines.map((text, index) => axisAlignedTextBounds({
    x: Array.isArray(component.x) ? component.x[index] : component.x,
    y: Array.isArray(component.y) ? component.y[index] : component.y,
    text,
    style,
    align: component.textAlign,
    rotation: component.rotation
  })));
}

export function unionTitleBounds(bounds) {
  return unionBounds(bounds);
}

export function layoutBoundsIntersect(first, second) {
  return first.left < second.right && first.right > second.left &&
    first.top < second.bottom && first.bottom > second.top;
}
