import { measureTextWidth, resolveTextBounds } from "../core/textMetrics.js";
import { alignLegendStart, resolveLegendGrid, isPlotLegend, legendLabelLineHeight } from "./legend.js";
import { alignLegendTitle, resolveLegendTitleText } from "./legendText.js";
import {resolveLegendContentSpacing} from "./legendSpacing.js";

// Measure item content before choosing its edge. Family owners supply the
// sample dimensions and formatted labels; this module does not inspect scales.
export function resolveLegendItemLayout(plot, config, labels, symbol, canvas, profile) {
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
  const inside = isPlotLegend(config);
  const side = inside || ["left", "right"].includes(config.position);
  const titleVisible = config.titleVisible !== false;
  const titleText = titleVisible ? resolveLegendTitleText(config.title, config.titleStyle, profile)
    : { width: 0, height: 0 };
  const titleWidth = titleVisible ? titleText.width : 0;
  const titleHeight = titleVisible ? titleText.height : 0;
  let symbolX;
  let labelX;
  let itemY;
  let itemRows;
  let title;
  if (config.layout === "legacy-bottom") {
    const widths = labels.map(text => sampleWidth + config.labels.offset + resolveLegendTitleText(text, config.labels, profile).width);
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
    itemRows = labels.map(() => 0);
    title = { x: x + width / 2, y: canvas.height - 52, align: "center" };
  } else if (side) {
    const grid = resolveLegendGrid({
      ...config, columns: config.columns ?? 1, domain: labels
    }, sampleWidth, labels.length, sampleHeight, profile);
    const width = Math.max(grid.gridWidth, titleWidth);
    const x = config.position === "right" ? plot.x + plot.width + config.offset
      : plot.x - config.offset - width;
    const itemHeight = Math.max(sampleHeight, legendLabelLineHeight(config.labels.fontSize), ...labels.map(text => resolveLegendTitleText(text, config.labels, profile).height));
    const pitch = Math.max(config.itemGap, itemHeight);
    let cursor = x;
    const columnStarts = grid.columnWidths.map(columnWidth => {
      const start = cursor;
      cursor += columnWidth + config.itemGap;
      return start;
    });
    symbolX = grid.cells.map(cell => columnStarts[cell.column] - sampleLeft);
    labelX = grid.cells.map(cell => columnStarts[cell.column] + sampleWidth + config.labels.offset);
    let firstY = Math.max(plot.y + 52, titleVisible
      ? plot.y + 20 + titleHeight / 2 + 12 + itemHeight / 2 : plot.y + 52);
    if ((inside || config.groupCorner === true) && titleVisible) {
      const titleBounds = resolveTextBounds({ x: x, y: plot.y + 20,
        text: config.title, ...config.titleStyle, lines: titleText.lines,
        textAlign: "left", textBaseline: "middle" }, profile);
      const labelTops = labels.map(text => resolveTextBounds({
        x: 0, y: 0, text, ...config.labels, lines: resolveLegendTitleText(text, config.labels, profile).lines,
        textAlign: "left", textBaseline: "middle"
      }, profile).top);
      const itemTop = Math.min(...sampleBounds.map(bounds => bounds.top), ...labelTops);
      firstY = titleBounds.bottom + 12 - itemTop;
    }
    itemY = grid.cells.map(cell => firstY + cell.row * pitch);
    itemRows = grid.cells.map(cell => cell.row);
    title = { x, y: plot.y + 20, align: "left" };
  } else {
    const grid = resolveLegendGrid({ ...config, domain: labels }, sampleWidth, labels.length, sampleHeight, profile);
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
    itemRows = grid.cells.map(cell => cell.row);
    title = inline ? { x, y: y + height / 2, align: "left" }
      : { x: x + width / 2, y: y + titleHeight / 2, align: "center" };
  }
  const textBounds = (x, y, text, style, align = "left") => resolveTextBounds({
    x, y, text, ...style, lines: resolveLegendTitleText(text, style, profile).lines, textAlign: align, textBaseline: "middle"
  }, profile);
  const labelBounds = labels.map((label,index) => textBounds(labelX[index],itemY[index],label,config.labels));
  const symbolItemBounds = symbolX.map((x, index) => {
      const local = sampleBounds[index];
      return { left: x + local.left, right: x + local.right,
        top: itemY[index] + local.top, bottom: itemY[index] + local.bottom };
    });
  const spacingItems = config.rowPadding === undefined && config.titlePadding === undefined ? undefined
    : labels.map((label,index) => ({row:itemRows[index],x:symbolX[index],y:itemY[index],bounds:[
    ...(label === "" ? [] : [labelBounds[index]]),
    ...(symbol.itemBounds !== undefined && index >= symbol.itemBounds.length ? [] : [symbolItemBounds[index]])
  ]}));
  const bodyBounds = spacingItems === undefined
    ? [...labelBounds,...symbolItemBounds] : spacingItems.flatMap(item => item.bounds);
  if (titleVisible) title = alignLegendTitle(title, config.title, config.titleStyle, bodyBounds, profile);
  const titleBounds = titleVisible ? resolveTextBounds({ x: title.x, y: title.y,
      text: config.title, ...config.titleStyle, lines: titleText.lines,
      textAlign: title.align, textBaseline: "middle" }, profile) : undefined;
  let bounds = [...(titleVisible ? [titleBounds] : []),...bodyBounds];
  const spacing = spacingItems === undefined ? undefined : resolveLegendContentSpacing(config,spacingItems,titleBounds);
  if (spacing !== undefined) {
    symbolX = symbolX.map((x,index) => x+spacing.offsets[index].dx);
    labelX = labelX.map((x,index) => x+spacing.offsets[index].dx);
    itemY = itemY.map((y,index) => y+spacing.offsets[index].dy);
    title = {...title,x:title.x+spacing.titleOffset.dx,y:title.y+spacing.titleOffset.dy};
    bounds = spacing.bounds;
  }
  if (config.layout === "legacy-bottom") {
    const itemBounds = titleVisible ? bounds.slice(1) : bounds;
    if (titleVisible && itemBounds.some(bound => bound.top < bounds[0].bottom)) {
      throw new Error("Legacy bottom legend requires more space between its fixed title and item rows.");
    }
    if (bounds.some(bound => bound.top <= plot.y + plot.height)) {
      throw new Error("Legacy bottom legend requires more bottom-margin space.");
    }
  }
  if (inside) {
    const left = Math.min(...bounds.map(b => b.left));
    const right = Math.max(...bounds.map(b => b.right));
    const top = Math.min(...bounds.map(b => b.top));
    const bottom = Math.max(...bounds.map(b => b.bottom));
    const inset = config.offset + (config.border === false ? 0 : config.border.padding + config.border.lineWidth / 2);
    if (right - left + 2 * inset > plot.width || bottom - top + 2 * inset > plot.height) {
      throw new Error("In-plot legend does not fit the plot; reduce its content or dimensions.");
    }
    const dx = config.position.endsWith("left") ? plot.x + inset - left
      : plot.x + plot.width - inset - right;
    const dy = config.position.startsWith("top") ? plot.y + inset - top
      : plot.y + plot.height - inset - bottom;
    return { symbolX: symbolX.map(x => x + dx), labelX: labelX.map(x => x + dx),
      itemY: itemY.map(y => y + dy), title: { ...title, x: title.x + dx, y: title.y + dy },
      bounds: bounds.map(b => ({ left: b.left + dx, right: b.right + dx, top: b.top + dy, bottom: b.bottom + dy })) };
  }
  return { symbolX, labelX, itemY, title, bounds };
}
