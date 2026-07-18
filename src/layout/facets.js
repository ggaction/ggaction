import { cloneAndFreeze } from "../core/immutable.js";
import {
  DEFAULT_COMPOSITION_LAYOUT,
  normalizeCompositionAlign,
  normalizeCompositionChildren,
  normalizeCompositionPadding,
  validateCompositionSpacing
} from "./composition.js";

export const DEFAULT_FACET_LEGEND_GAP = 18;
export const DEFAULT_FACET_LEGEND_WIDTH = 132;

function resolveColumns(columns, count) {
  const value = columns ?? count;
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError("Facet columns must be a positive integer.");
  }
  return Math.min(value, count);
}

function alignedOffset(remaining, align) {
  if (align === "start") return 0;
  if (align === "end") return remaining;
  return remaining / 2;
}

export function resolveFacetLayout({
  children,
  columns,
  gap = DEFAULT_COMPOSITION_LAYOUT.gap,
  align = DEFAULT_COMPOSITION_LAYOUT.align,
  padding = DEFAULT_COMPOSITION_LAYOUT.padding,
  titleHeight = 0,
  sharedLegend = false
} = {}) {
  const values = children?.map(child => child?.value);
  const resolvedChildren = normalizeCompositionChildren(children?.map(
    ({ value: _value, ...child }) => child
  ));
  const resolvedColumns = resolveColumns(columns, resolvedChildren.length);
  const resolvedGap = validateCompositionSpacing(gap, "Facet gap");
  const resolvedAlign = normalizeCompositionAlign(align);
  const resolvedPadding = normalizeCompositionPadding(padding);
  const resolvedTitleHeight = validateCompositionSpacing(
    titleHeight,
    "Facet title height"
  );
  if (typeof sharedLegend !== "boolean") {
    throw new TypeError("Facet sharedLegend must be a boolean.");
  }
  const rowCount = Math.ceil(resolvedChildren.length / resolvedColumns);
  const columnWidths = Array.from({ length: resolvedColumns }, (_, column) =>
    Math.max(...resolvedChildren
      .filter((_, index) => index % resolvedColumns === column)
      .map(child => child.width))
  );
  const rowHeights = Array.from({ length: rowCount }, (_, row) =>
    Math.max(...resolvedChildren
      .slice(row * resolvedColumns, (row + 1) * resolvedColumns)
      .map(child => child.height))
  );
  const columnStarts = columnWidths.map((_, column) =>
    resolvedPadding.left + columnWidths
      .slice(0, column)
      .reduce((sum, width) => sum + width, 0) + resolvedGap * column
  );
  const rowStarts = rowHeights.map((_, row) =>
    resolvedTitleHeight + resolvedPadding.top + rowHeights
      .slice(0, row)
      .reduce((sum, height) => sum + height, 0) + resolvedGap * row
  );
  const placements = resolvedChildren.map((child, index) => {
    const column = index % resolvedColumns;
    const row = Math.floor(index / resolvedColumns);
    return {
      id: child.id,
      value: values[index],
      column,
      row,
      x: columnStarts[column] + alignedOffset(
        columnWidths[column] - child.width,
        resolvedAlign
      ),
      y: rowStarts[row] + alignedOffset(
        rowHeights[row] - child.height,
        resolvedAlign
      ),
      width: child.width,
      height: child.height
    };
  });
  const gridWidth = resolvedPadding.left +
    columnWidths.reduce((sum, width) => sum + width, 0) +
    resolvedGap * Math.max(0, resolvedColumns - 1) +
    resolvedPadding.right;
  const gridHeight = resolvedTitleHeight + resolvedPadding.top +
    rowHeights.reduce((sum, height) => sum + height, 0) +
    resolvedGap * Math.max(0, rowCount - 1) +
    resolvedPadding.bottom;
  return cloneAndFreeze({
    columns: resolvedColumns,
    rows: rowCount,
    gap: resolvedGap,
    align: resolvedAlign,
    padding: resolvedPadding,
    titleHeight: resolvedTitleHeight,
    gridWidth,
    width: gridWidth + (sharedLegend
      ? DEFAULT_FACET_LEGEND_GAP + DEFAULT_FACET_LEGEND_WIDTH
      : 0),
    height: gridHeight,
    children: placements,
    ...(sharedLegend ? {
      legend: {
        x: gridWidth + DEFAULT_FACET_LEGEND_GAP,
        y: resolvedTitleHeight + resolvedPadding.top + 30,
        width: DEFAULT_FACET_LEGEND_WIDTH
      }
    } : {})
  });
}
