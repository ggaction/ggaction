import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import {
  BAR_HIGHLIGHT_LAYOUT,
  selectTallestHistogramStack,
  selectTopmostHistogramSegment
} from "./reference-values.js";

test("selects the unique tallest histogram stack by its semantic upper endpoint", () => {
  const { target } = selectTallestHistogramStack(loadCars());

  assert.deepEqual(target, {
    key: "bars/stack/1",
    indices: [3, 4, 5],
    bin: 1,
    interval: [100, 150],
    total: 104,
    segmentCounts: { USA: 40, Europe: 36, Japan: 28 },
    concrete: {
      x: 112.44444444444444,
      y: 113.33333333333331,
      width: 32.44444444444444,
      height: 216.66666666666669
    }
  });
});

test("selects one rect whose semantic y2 endpoint is highest", () => {
  const { target } = selectTopmostHistogramSegment(loadCars());

  assert.deepEqual(target, {
    key: "bars/histogram/5",
    index: 5,
    bin: 1,
    interval: [100, 150],
    origin: "Japan",
    start: 76,
    end: 104,
    count: 28,
    concrete: {
      x: 112.44444444444444,
      y: 113.33333333333331,
      width: 32.44444444444444,
      height: 58.33333333333337
    }
  });
});

test("keeps the semantic target while Canvas-only geometry changes", () => {
  const cars = loadCars();
  const baseline = selectTallestHistogramStack(cars).target;
  const resized = selectTallestHistogramStack(cars, {
    height: BAR_HIGHLIGHT_LAYOUT.height + 120
  }).target;

  assert.equal(resized.key, baseline.key);
  assert.equal(resized.total, baseline.total);
  assert.deepEqual(resized.interval, baseline.interval);
  assert.deepEqual(resized.segmentCounts, baseline.segmentCounts);
  assert.notEqual(resized.concrete.height, baseline.concrete.height);
  assert.notEqual(resized.concrete.y, baseline.concrete.y);

  const segment = selectTopmostHistogramSegment(cars).target;
  const resizedSegment = selectTopmostHistogramSegment(cars, {
    height: BAR_HIGHLIGHT_LAYOUT.height + 120
  }).target;
  assert.equal(resizedSegment.key, segment.key);
  assert.equal(resizedSegment.start, segment.start);
  assert.equal(resizedSegment.end, segment.end);
  assert.notEqual(resizedSegment.concrete.height, segment.concrete.height);
});
