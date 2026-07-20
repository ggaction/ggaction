import { createBin2DReference } from "../../oracles/bin2d.js";

export const BINNED_HEATMAP_LAYOUT = Object.freeze({
  width: 700,
  height: 500,
  margin: Object.freeze({ top: 70, right: 140, bottom: 75, left: 85 }),
  xExtent: Object.freeze([1500, 5200]),
  yExtent: Object.freeze([8, 48]),
  bins: Object.freeze({ x: 10, y: 8 })
});

export const BINNED_HEATMAP_FIELDS = Object.freeze({
  x0: "weight0",
  x1: "weight1",
  y0: "mpg0",
  y1: "mpg1",
  count: "count"
});

export function createCarsBinnedHeatmapReference(cars) {
  return createBin2DReference(cars, {
    id: "carsWeightMpg",
    x: "Weight_in_lbs",
    y: "Miles_per_Gallon",
    bins: BINNED_HEATMAP_LAYOUT.bins,
    extent: {
      x: BINNED_HEATMAP_LAYOUT.xExtent,
      y: BINNED_HEATMAP_LAYOUT.yExtent
    },
    includeEmpty: true,
    as: BINNED_HEATMAP_FIELDS
  });
}
