import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validateCompositionSpacing } from "./composition.js";

/** Pack ordered full content bounds without imposing common plot origins. */
export function resolveFacetContentFlow({ children, columns, gap = 16 } = {}) {
  if (!Array.isArray(children) || children.length === 0) {
    throw new TypeError("Facet content flow requires non-empty children.");
  }
  columns ??= children.length;
  if (!Number.isInteger(columns) || columns <= 0) {
    throw new RangeError("Facet content flow columns must be a positive integer.");
  }
  columns = Math.min(columns, children.length);
  validateCompositionSpacing(gap, "Facet content flow gap");
  const ids = new Set();
  const rightExtents = Array(columns).fill(0);
  const bottomExtents = Array(Math.ceil(children.length / columns)).fill(0);
  const cells = children.map((child, index) => {
    if (!isPlainObject(child) || typeof child.id !== "string" ||
        child.id.length === 0 || ids.has(child.id)) {
      throw new TypeError("Facet content flow requires unique non-empty child IDs.");
    }
    const bounds = child.bounds;
    if (!isPlainObject(bounds) ||
        !["left", "right", "top", "bottom"].every(key => Number.isFinite(bounds[key])) ||
        bounds.left > bounds.right || bounds.top > bounds.bottom) {
      throw new RangeError("Facet content flow requires finite ordered content bounds.");
    }
    ids.add(child.id);
    const column = index % columns, row = Math.floor(index / columns);
    rightExtents[column] = Math.max(rightExtents[column], Math.ceil(bounds.right));
    bottomExtents[row] = Math.max(bottomExtents[row], Math.ceil(bounds.bottom));
    return { id: child.id, column, row, bounds: { ...bounds } };
  });
  const columnOrigins = Array(columns).fill(0);
  let x = 0;
  const placed = cells.map(cell => {
    x = cell.column === 0 ? 0 : x + rightExtents[cell.column - 1] + gap +
      Math.max(0, Math.ceil(-cell.bounds.left));
    if (cell.row > 0) {
      columnOrigins[cell.column] += bottomExtents[cell.row - 1] + gap +
        Math.max(0, Math.ceil(-cell.bounds.top));
    }
    const y = columnOrigins[cell.column];
    if (![x, y, x + cell.bounds.left, x + cell.bounds.right,
      y + cell.bounds.top, y + cell.bounds.bottom].every(Number.isFinite)) {
      throw new RangeError("Facet content flow exceeds finite layout bounds.");
    }
    return {
      id: cell.id, column: cell.column, row: cell.row, x, y,
      bounds: {
        left: x + cell.bounds.left, right: x + cell.bounds.right,
        top: y + cell.bounds.top, bottom: y + cell.bounds.bottom
      }
    };
  });
  const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  for (const child of placed) {
    bounds.left = Math.min(bounds.left, child.bounds.left);
    bounds.right = Math.max(bounds.right, child.bounds.right);
    bounds.top = Math.min(bounds.top, child.bounds.top);
    bounds.bottom = Math.max(bounds.bottom, child.bounds.bottom);
  }
  return cloneAndFreeze({ columns, gap, children: placed, bounds });
}

/** Place one shared footer per occupied column beneath the complete content. */
export function resolveFacetContentFooters({ flow, footers, offset = 0 } = {}) {
  if (!isPlainObject(flow) || !Array.isArray(flow.children) || flow.children.length === 0 ||
      !Number.isFinite(flow.bounds?.bottom)) {
    throw new TypeError("Facet content footers require a resolved content flow.");
  }
  if (!Array.isArray(footers) || !Number.isFinite(offset)) {
    throw new TypeError("Facet content footers require an array and finite offset.");
  }
  const lastByColumn = new Map(), occupied = new Set(), ownerIds = new Set();
  for (const child of flow.children) {
    if (!isPlainObject(child) || typeof child.id !== "string" || child.id.length === 0 || ownerIds.has(child.id) ||
        !Number.isInteger(child.column) || child.column < 0 ||
        !Number.isInteger(child.row) || child.row < 0 || !Number.isFinite(child.x)) {
      throw new RangeError("Facet content footer owners require finite occupied cells.");
    }
    const slot = `${child.row}:${child.column}`;
    if (occupied.has(slot)) throw new Error("Facet content footer column has duplicate cells.");
    occupied.add(slot); ownerIds.add(child.id);
    const previous = lastByColumn.get(child.column);
    if (previous === undefined || child.row > previous.row) lastByColumn.set(child.column, child);
  }
  const columns = new Set(), ids = new Set(), y = Math.ceil(flow.bounds.bottom) + offset;
  if (!Number.isFinite(y)) throw new RangeError("Facet content footer exceeds finite layout bounds.");
  return cloneAndFreeze(footers.map(footer => {
    if (!isPlainObject(footer) || typeof footer.id !== "string" || footer.id.length === 0 ||
        ids.has(footer.id) || !Number.isInteger(footer.column) ||
        columns.has(footer.column) || !lastByColumn.has(footer.column)) {
      throw new Error("Facet content footer requires one unique ID and occupied column.");
    }
    ids.add(footer.id); columns.add(footer.column);
    const owner = lastByColumn.get(footer.column);
    return { id: footer.id, column: footer.column, ownerId: owner.id, x: owner.x, y };
  }));
}
