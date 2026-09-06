import { measureTextWidth, resolveTextBounds } from "../core/textMetrics.js";
import { alignLegendStart, resolveLegendGrid } from "./legend.js";

// Measure item content before choosing its edge. Family owners supply the
// sample dimensions and formatted labels; this module does not inspect scales.
export function resolveLegendItemLayout(plot, config, labels, symbol, canvas) {
  const strokes = labels.map((_, index) => Array.isArray(symbol.strokeWidth)
    ? symbol.strokeWidth[index] : symbol.strokeWidth ?? 0);
  const sampleBounds = labels.map((_, index) => symbol.itemBounds?.[index] ?? {
    left: -strokes[index] / 2, right: symbol.width + strokes[index] / 2,
    top: -symbol.height / 2 - strokes[index] / 2,
    bottom: symbol.height / 2 + strokes[index] / 2
  });
  // Retain a family's minimum slot while reserving its complete painted extent.
  const sampleLeft = Math.min(0, ...sampleBounds.map(bounds => bounds.left));
  const sampleRight = Math.max(symbol.width, ...sampleBounds.map(bounds => bounds.right));
  const sampleWidth = sampleRight - sampleLeft;
  const sampleHeight = Math.max(symbol.height,
    ...sampleBounds.map(bounds => 2 * Math.max(-bounds.top, bounds.bottom)));
  const side = ["left", "right"].includes(config.position);
  const titleVisible = config.titleVisible !== false;
  const titleWidth = titleVisible ? measureTextWidth(config.title, config.titleStyle) : 0;
  const titleHeight = titleVisible ? config.titleStyle.fontSize : 0;
  const itemWidth = sampleWidth + config.labels.offset + Math.max(...labels.map(
    text => measureTextWidth(text, config.labels)
  ));
  let symbolX;
  let labelX;
  let itemY;
  let title;
  if (config.layout === "legacy-bottom") {
    const widths = labels.map(text => sampleWidth + config.labels.offset + measureTextWidth(text, config.labels));
    const width = widths.reduce((sum, value) => sum + value, 0) + config.itemGap * (labels.length - 1);
    const x = config.align === "center" ? (canvas.width - width) / 2 : alignLegendStart(plot, width, config.align);
    let cursor = x;
    symbolX = widths.map(width => {
      const start = cursor - sampleLeft;
      cursor += width + config.itemGap;
      return start;
    });
    labelX = symbolX.map(value => value + sampleRight + config.labels.offset);
    itemY = labels.map(() => canvas.height - 28);
    title = { x: x + width / 2, y: canvas.height - 52, align: "center" };
  } else if (side) {
    const width = Math.max(itemWidth, titleWidth);
    const x = config.position === "right" ? plot.x + plot.width + config.offset
      : plot.x - config.offset - width;
    const itemHeight = Math.max(sampleHeight, config.labels.fontSize);
    const pitch = Math.max(config.itemGap, itemHeight);
    symbolX = labels.map(() => x - sampleLeft);
    labelX = labels.map(() => x + sampleWidth + config.labels.offset);
    const firstY = Math.max(plot.y + 52, titleVisible
      ? plot.y + 20 + titleHeight / 2 + 12 + itemHeight / 2 : plot.y + 52);
    itemY = labels.map((_, index) => firstY + index * pitch);
    title = { x, y: plot.y + 20, align: "left" };
  } else {
    const grid = resolveLegendGrid({ ...config, domain: labels }, sampleWidth, labels.length, sampleHeight);
    const inline = config.titlePosition === "left" && titleVisible;
    const prefix = inline ? titleWidth + 20 : 0;
    const width = inline ? prefix + grid.gridWidth : Math.max(titleWidth, grid.gridWidth);
    const top = !inline && titleVisible ? titleHeight + 12 : 0;
    const height = inline ? Math.max(titleHeight, grid.gridHeight) : top + grid.gridHeight;
    const x = alignLegendStart(plot, width, config.align);
    const y = config.position === "top" ? plot.y - config.offset - height
      : plot.y + plot.height + config.offset;
    const gridX = inline ? x + prefix : x + (width - grid.gridWidth) / 2;
    const gridY = inline ? y + (height - grid.gridHeight) / 2 : y + top;
    let cursor = 0;
    const columns = grid.columnWidths.map(width => {
      const start = cursor;
      cursor += width + config.itemGap;
      return start;
    });
    symbolX = grid.cells.map(cell => gridX + columns[cell.column] - sampleLeft);
    labelX = symbolX.map(value => value + sampleRight + config.labels.offset);
    itemY = grid.cells.map(cell => gridY + grid.rowHeight / 2 + cell.row * (grid.rowHeight + config.itemGap));
    title = inline ? { x, y: y + height / 2, align: "left" }
      : { x: x + width / 2, y: y + titleHeight / 2, align: "center" };
  }
  const textBounds = (x, y, text, style, align = "left") => resolveTextBounds({
    x, y, text, ...style, textAlign: align, textBaseline: "middle"
  });
  const bounds = [
    ...(titleVisible ? [textBounds(title.x, title.y, config.title, config.titleStyle, title.align)] : []),
    ...labels.map((label, index) => textBounds(labelX[index], itemY[index], label, config.labels)),
    ...symbolX.map((x, index) => {
      const local = sampleBounds[index];
      return { left: x + local.left, right: x + local.right,
        top: itemY[index] + local.top, bottom: itemY[index] + local.bottom };
    })
  ];
  if (config.layout === "legacy-bottom") {
    const itemBounds = titleVisible ? bounds.slice(1) : bounds;
    if (titleVisible && itemBounds.some(bound => bound.top < bounds[0].bottom)) {
      throw new Error("Legacy bottom legend requires more space between its fixed title and item rows.");
    }
    if (bounds.some(bound => bound.top <= plot.y + plot.height)) {
      throw new Error("Legacy bottom legend requires more bottom-margin space.");
    }
  }
  return { symbolX, labelX, itemY, title, bounds };
}
