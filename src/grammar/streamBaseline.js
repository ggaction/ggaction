import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray } from "../core/ownData.js";
import { validateGeneratedItemLimit } from "../core/validation.js";
import { restoreFiniteScale, stableFinitePrefixSums, stableFiniteSum } from "./numeric.js";

// Each column contains the aligned series at one increasing independent value.
// A null column is an explicit gap shared by every series, never a zero value.
export function layoutWiggleSeries(columns) {
  ownArray(columns, "Wiggle columns");
  validateGeneratedItemLimit(columns.length, "Wiggle sample count");
  let count, scale = 0, cells = 0;
  for (const column of columns) {
    if (column === null) continue;
    ownArray(column, "Wiggle series values");
    if (column.length === 0 || count !== undefined && column.length !== count) {
      throw new Error("Wiggle requires aligned nonempty series columns.");
    }
    count = column.length;
    cells += count;
    validateGeneratedItemLimit(cells, "Wiggle cell count");
    for (const value of column) {
      if (!Number.isFinite(value) || value < 0) throw new TypeError("Wiggle values must be finite and nonnegative.");
      scale = Math.max(scale, value);
    }
  }
  scale ||= 1;
  let previous, baseline = 0;
  return cloneAndFreeze(columns.map(column => {
    if (column === null) { previous = undefined; baseline = 0; return null; }
    const normalized = column.map(value => value / scale);
    if (previous !== undefined) {
      const differences = normalized.map((value, index) => value - previous[index]);
      const prefixes = stableFinitePrefixSums(differences, "Wiggle difference sum", { compensated: true });
      const total = stableFiniteSum(normalized, "Wiggle column total", { compensated: true });
      if (total > 0) {
        // Minimize the thickness-weighted squared change of layer centers.
        const weighted = normalized.map((value, index) => (value / total) * (prefixes[index] - differences[index] / 2));
        baseline -= stableFiniteSum(weighted, "Wiggle baseline change", { compensated: true });
      }
    }
    previous = normalized;
    const prefixes = stableFinitePrefixSums(normalized, "Wiggle stacked values", { compensated: true });
    return column.map((value, index) => {
      const start = restoreFiniteScale(baseline + (index === 0 ? 0 : prefixes[index - 1]), scale, "Wiggle lower bound");
      const end = restoreFiniteScale(baseline + prefixes[index], scale, "Wiggle upper bound");
      if (value > 0 && end <= start) throw new RangeError("Wiggle positive value cannot resolve distinct finite bounds.");
      return { index, value, start, end };
    });
  }));
}
