import {
  formatVisibleText,
  measureTextWidth
} from "../core/textMetrics.js";

export function measureLegendTextWidth(value, style = { fontSize: 12 }) {
  return measureTextWidth(formatVisibleText(value), style);
}

export function resolveLegendGrid(config, width, count, symbolHeight) {
  const labels = config.domain.map(formatVisibleText);
  const itemWidths = labels.map(
    label => width + config.labels.offset +
      measureLegendTextWidth(label, config.labels)
  );
  const columnCount = Math.min(config.columns ?? count, count);
  const rowCount = Math.ceil(count / columnCount);
  const columnWidths = [];
  const cells = Array.from({ length: count }, (_, index) => {
    const cell = config.direction === "horizontal"
      ? { column: index % columnCount, row: Math.floor(index / columnCount) }
      : { column: Math.floor(index / rowCount), row: index % rowCount };
    columnWidths[cell.column] = Math.max(
      columnWidths[cell.column] ?? 0,
      itemWidths[index]
    );
    return cell;
  });
  const actualColumns = columnWidths.length;
  const gridWidth = columnWidths.reduce((sum, value) => sum + value, 0) +
    config.itemGap * Math.max(0, actualColumns - 1);
  const rowHeight = Math.max(
    config.labels.fontSize,
    symbolHeight
  );
  const gridHeight = rowHeight * rowCount +
    config.itemGap * Math.max(0, rowCount - 1);
  return { cells, columnWidths, gridWidth, gridHeight, rowHeight };
}

export function alignLegendStart(bounds, width, align) {
  if (align === "left") return bounds.x;
  if (align === "right") return bounds.x + bounds.width - width;
  return bounds.x + (bounds.width - width) / 2;
}
