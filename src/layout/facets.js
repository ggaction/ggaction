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
export const DEFAULT_FACET_LEGEND_HEIGHT = 0;

const FACET_LEGEND_POSITIONS = Object.freeze([
  "right", "left", "top", "bottom"
]);

function resolveColumns(columns, count) {
  const value = columns ?? count;
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError("Facet columns must be a positive integer.");
  }
  return Math.min(value, count);
}

function resolveGridCoordinates(children, columns) {
  const requested = children.some(child => child.row !== undefined || child.column !== undefined);
  if (!requested) return undefined;
  if (children.some(child => !(
    Number.isInteger(child.row) && child.row >= 0 &&
    Number.isInteger(child.column) && child.column >= 0
  ))) {
    throw new RangeError("Facet grid children require non-negative integer row and column coordinates.");
  }
  const keys = children.map(child => `${child.row}:${child.column}`);
  if (new Set(keys).size !== keys.length) {
    throw new Error("Facet grid children must occupy unique row and column coordinates.");
  }
  const requiredColumns = Math.max(...children.map(child => child.column)) + 1;
  if (columns !== undefined && columns !== requiredColumns) {
    throw new RangeError("Facet grid columns must match the declared column domain.");
  }
  return {
    columns: requiredColumns,
    rows: Math.max(...children.map(child => child.row)) + 1
  };
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
  sharedLegend = false,
  sharedLegendGap = DEFAULT_FACET_LEGEND_GAP,
  sharedLegendWidth = DEFAULT_FACET_LEGEND_WIDTH,
  sharedLegendHeight = DEFAULT_FACET_LEGEND_HEIGHT,
  sharedLegendPosition = "right"
} = {}) {
  const values = children?.map(child => child?.value);
  const coordinates = resolveGridCoordinates(children ?? [], columns);
  const resolvedChildren = normalizeCompositionChildren(children?.map(
    ({ value: _value, row: _row, column: _column, ...child }) => child
  ));
  const resolvedColumns = coordinates?.columns ??
    resolveColumns(columns, resolvedChildren.length);
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
  const legendGap = validateCompositionSpacing(
    sharedLegendGap,
    "Facet shared legend gap"
  );
  const legendWidth = validateCompositionSpacing(
    sharedLegendWidth,
    "Facet shared legend width"
  );
  const legendHeight = validateCompositionSpacing(
    sharedLegendHeight,
    "Facet shared legend height"
  );
  if (!FACET_LEGEND_POSITIONS.includes(sharedLegendPosition)) {
    throw new Error(
      `Unknown facet shared legend position "${sharedLegendPosition}".`
    );
  }
  const sideLegend = ["right", "left"].includes(sharedLegendPosition);
  const beforeGrid = ["left", "top"].includes(sharedLegendPosition);
  const legendLane = sharedLegend
    ? legendGap + (sideLegend ? legendWidth : legendHeight)
    : 0;
  const rowCount = coordinates?.rows ??
    Math.ceil(resolvedChildren.length / resolvedColumns);
  const columnWidths = Array(resolvedColumns).fill(-Infinity);
  const rowHeights = Array(rowCount).fill(-Infinity);
  resolvedChildren.forEach((child, index) => {
    const column = coordinates === undefined
      ? index % resolvedColumns
      : children[index].column;
    const row = coordinates === undefined
      ? Math.floor(index / resolvedColumns)
      : children[index].row;
    columnWidths[column] = Math.max(columnWidths[column], child.width);
    rowHeights[row] = Math.max(rowHeights[row], child.height);
  });
  const columnStarts = columnWidths.map((_, column) =>
    resolvedPadding.left + columnWidths.slice(0, column)
      .reduce((sum, width) => sum + width, 0) + resolvedGap * column
  );
  const rowStarts = rowHeights.map((_, row) =>
    resolvedTitleHeight + resolvedPadding.top + rowHeights.slice(0, row)
      .reduce((sum, height) => sum + height, 0) + resolvedGap * row
  );
  const placements = resolvedChildren.map((child, index) => {
    const column = coordinates === undefined
      ? index % resolvedColumns
      : children[index].column;
    const row = coordinates === undefined
      ? Math.floor(index / resolvedColumns)
      : children[index].row;
    return {
      id: child.id,
      value: values[index],
      column,
      row,
      x: columnStarts[column] + (beforeGrid && sideLegend ? legendLane : 0) +
        alignedOffset(
          columnWidths[column] - child.width,
          resolvedAlign
        ),
      y: rowStarts[row] + (beforeGrid && !sideLegend ? legendLane : 0) +
        alignedOffset(
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
    width: gridWidth + (sideLegend ? legendLane : 0),
    height: gridHeight + (sideLegend ? 0 : legendLane),
    children: placements,
    ...(sharedLegend ? {
      legend: {
        position: sharedLegendPosition,
        x: sharedLegendPosition === "right"
          ? gridWidth + legendGap
          : 0,
        y: sharedLegendPosition === "bottom"
          ? gridHeight + legendGap
          : sharedLegendPosition === "top"
            ? resolvedTitleHeight
            : resolvedTitleHeight + resolvedPadding.top + 30,
        width: legendWidth,
        height: legendHeight
      }
    } : {})
  });
}
