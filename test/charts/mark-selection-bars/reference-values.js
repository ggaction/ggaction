import { createCarsHistogramValues } from "../../charts/cars-histogram/reference-values.js";

export const BAR_HIGHLIGHT_LAYOUT = Object.freeze({
  width: 432,
  height: 460,
  margin: Object.freeze({ top: 80, right: 60, bottom: 130, left: 80 })
});

export const BAR_HIGHLIGHT_TARGET = Object.freeze({
  fill: "#facc15",
  stroke: "#713f12",
  strokeWidth: 2.5,
  opacity: 1
});

export function selectTallestHistogramStack(
  cars,
  {
    width = BAR_HIGHLIGHT_LAYOUT.width,
    height = BAR_HIGHLIGHT_LAYOUT.height,
    margin = BAR_HIGHLIGHT_LAYOUT.margin
  } = {}
) {
  const values = createCarsHistogramValues(cars, {
    width,
    height,
    margin,
    field: "Displacement",
    maxBins: 10,
    stack: "zero"
  });
  const maximumTotal = Math.max(...values.bins.map(bin => bin.total));
  const selectedBins = values.bins.filter(bin => bin.total === maximumTotal);
  if (selectedBins.length !== 1) {
    throw new Error("Histogram highlight requires one unique maximum-total histogram stack.");
  }
  const [bin] = selectedBins;
  const segments = values.rects
    .map((rect, index) => ({ rect, index }))
    .filter(({ rect }) => rect.bin === bin.index);
  const left = Math.min(...segments.map(({ rect }) => rect.x));
  const top = Math.min(...segments.map(({ rect }) => rect.y));
  const right = Math.max(...segments.map(({ rect }) => rect.x + rect.width));
  const bottom = Math.max(...segments.map(({ rect }) => rect.y + rect.height));
  return Object.freeze({
    rows: values.validCars,
    target: Object.freeze({
      key: `bars/stack/${bin.index}`,
      indices: Object.freeze(segments.map(({ index }) => index)),
      bin: bin.index,
      interval: Object.freeze([bin.start, bin.end]),
      total: bin.total,
      segmentCounts: Object.freeze({ ...bin.counts }),
      concrete: Object.freeze({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top
      })
    })
  });
}

export function selectTopmostHistogramSegment(
  cars,
  {
    width = BAR_HIGHLIGHT_LAYOUT.width,
    height = BAR_HIGHLIGHT_LAYOUT.height,
    margin = BAR_HIGHLIGHT_LAYOUT.margin
  } = {}
) {
  const values = createCarsHistogramValues(cars, {
    width,
    height,
    margin,
    field: "Displacement",
    maxBins: 10,
    stack: "zero"
  });
  const maximumEnd = Math.max(...values.rects.map(rect => rect.stackEnd));
  const selected = values.rects
    .map((rect, index) => ({ rect, index }))
    .filter(({ rect }) => rect.stackEnd === maximumEnd);
  if (selected.length !== 1) {
    throw new Error("Histogram highlight requires one unique maximum-y2 histogram segment.");
  }
  const [{ rect, index }] = selected;
  const bin = values.bins[rect.bin];
  return Object.freeze({
    rows: values.validCars,
    target: Object.freeze({
      key: `bars/histogram/${index}`,
      index,
      bin: rect.bin,
      interval: Object.freeze([bin.start, bin.end]),
      origin: rect.origin,
      start: rect.stackStart,
      end: rect.stackEnd,
      count: rect.count,
      concrete: Object.freeze({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      })
    })
  });
}
