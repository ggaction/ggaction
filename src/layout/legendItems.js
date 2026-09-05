import { measureTextWidth, resolveTextBounds } from "../core/textMetrics.js";
import { alignLegendStart, resolveLegendGrid } from "./legend.js";

// Measure item content before choosing its edge. Family owners supply the
// sample dimensions and formatted labels; this module does not inspect scales.
export function resolveLegendItemLayout(plot, config, labels, symbol) {
  const strokes = labels.map((_, index) => Array.isArray(symbol.strokeWidth)
    ? symbol.strokeWidth[index] : symbol.strokeWidth ?? 0);
  const sampleHeight = Math.max(symbol.height, ...strokes);
  const side = ["left", "right"].includes(config.position);
  const titleVisible = config.titleVisible !== false;
  const titleWidth = titleVisible ? measureTextWidth(config.title, config.titleStyle) : 0;
  const titleHeight = titleVisible ? config.titleStyle.fontSize : 0;
  const itemWidth = symbol.width + config.labels.offset + Math.max(...labels.map(
    text => measureTextWidth(text, config.labels)
  ));
  let symbolX;
  let labelX;
  let itemY;
  let title;
  if (side) {
    const width = Math.max(itemWidth, titleWidth);
    const x = config.position === "right" ? plot.x + plot.width + config.offset
      : plot.x - config.offset - width;
    const itemHeight = Math.max(sampleHeight, config.labels.fontSize);
    const pitch = Math.max(config.itemGap, itemHeight);
    symbolX = labels.map(() => x);
    labelX = labels.map(() => x + symbol.width + config.labels.offset);
    const firstY = Math.max(plot.y + 52, titleVisible
      ? plot.y + 20 + titleHeight / 2 + 12 + itemHeight / 2 : plot.y + 52);
    itemY = labels.map((_, index) => firstY + index * pitch);
    title = { x, y: plot.y + 20, align: "left" };
  } else {
    const grid = resolveLegendGrid({ ...config, domain: labels }, symbol.width, labels.length, sampleHeight);
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
    symbolX = grid.cells.map(cell => gridX + columns[cell.column]);
    labelX = symbolX.map(value => value + symbol.width + config.labels.offset);
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
    ...symbolX.map((x, index) => ({ left: x - strokes[index] / 2, right: x + symbol.width + strokes[index] / 2,
      top: itemY[index] - symbol.height / 2 - strokes[index] / 2, bottom: itemY[index] + symbol.height / 2 + strokes[index] / 2 }))
  ];
  return { symbolX, labelX, itemY, title, bounds };
}
