import { isPlainObject, cloneAndFreeze } from "../core/immutable.js";

// A detached result retains plot-normalized coordinates, not another data axis.
export function normalizePlotSnapshot(input) {
  if (!isPlainObject(input) || Object.keys(input).length === 0 ||
      Object.keys(input).some(key => !["x", "y"].includes(key)) ||
      Object.values(input).some(field => typeof field !== "string" || field.length === 0)) {
    throw new TypeError("Plot snapshot requires x and/or y field names.");
  }
  return cloneAndFreeze(input);
}

export function normalizePlotAnchor(input) {
  if (!isPlainObject(input) || Object.keys(input).length === 0 ||
      Object.keys(input).some(key => !["x", "y"].includes(key)) ||
      Object.values(input).some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new TypeError("Plot anchor requires x and/or y normalized constants.");
  }
  return cloneAndFreeze(input);
}
