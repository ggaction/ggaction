import { cloneAndFreeze } from "../../core/immutable.js";
import { normalizeContourGrid, normalizeContourThresholds, contourCells } from "./grid.js";
import { contourCellSegments, contourBandBoundary } from "./marching.js";
import { stitchGridRings } from "../gridBoundary.js";

export function contourGrid(input, thresholds) {
  const grid = normalizeContourGrid(input), levels = normalizeContourThresholds(thresholds, grid);
  const cells = contourCells(grid), cache = new Map();
  const regions = levels.map(value => {
    const segments = [];
    for (const cell of cells) {
      const { boundary, interior } = contourCellSegments(cell, value, true, cache);
      segments.push(...boundary, ...interior);
    }
    return { value, polygons: stitchGridRings(segments, grid) };
  });
  const bands = levels.slice(0, -1).map((lower, index) => {
    const upper = levels[index + 1], upperInclusive = index === levels.length - 2, segments = [];
    for (const cell of cells) {
      const low = contourCellSegments(cell, lower, true, cache);
      const high = contourCellSegments(cell, upper, !upperInclusive, cache);
      segments.push(...contourBandBoundary(cell, lower, upper, upperInclusive, cache), ...low.interior,
        ...high.interior.map(([a, b]) => [b, a]));
    }
    return { lower, upper, upperInclusive, polygons: stitchGridRings(segments, grid) };
  });
  return cloneAndFreeze({ algorithm: "marching-squares@1", grid, thresholds: regions, bands });
}
