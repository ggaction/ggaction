import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDiscretizedIntervals,
  mapDiscretizedColors,
  resolveDiscretizedColorScale
} from "../../../../src/grammar/scales/index.js";

const range = Object.freeze(["a", "b", "c", "d", "e"]);
const values = Object.freeze([50, 60, 70, 80, 90]);

test("rejects discretized color ranges above the generated item limit", () => {
  assert.throws(
    () => resolveDiscretizedColorScale({
      type: "quantize",
      domain: [0, 1],
      range: Array(10_001).fill("#000000"),
      values: [0, 1]
    }),
    /must not exceed 10000/
  );
});

test("resolves independent quantize, quantile, and threshold boundaries", () => {
  assert.deepEqual(resolveDiscretizedColorScale({
    type: "quantize",
    domain: "auto",
    range,
    values
  }).thresholds, [58, 66, 74, 82]);
  assert.deepEqual(resolveDiscretizedColorScale({
    type: "quantile",
    domain: "auto",
    range,
    values
  }).thresholds, [58, 66, 74, 82]);
  assert.deepEqual(resolveDiscretizedColorScale({
    type: "threshold",
    domain: [55, 65, 75, 85],
    range,
    values
  }).thresholds, [55, 65, 75, 85]);
});

test("places an exact boundary in the upper interval", () => {
  const scale = resolveDiscretizedColorScale({
    type: "threshold",
    domain: [60, 70],
    range: ["low", "middle", "high"],
    values
  });

  assert.deepEqual(
    mapDiscretizedColors([59, 60, 69, 70], scale),
    ["low", "middle", "middle", "high"]
  );
  assert.deepEqual(formatDiscretizedIntervals(scale.thresholds), [
    "< 60", "60–70", "≥ 70"
  ]);
});

test("rejects invalid threshold contracts before mapping", () => {
  assert.throws(() => resolveDiscretizedColorScale({
    type: "threshold",
    domain: "auto",
    range,
    values
  }), /explicit domain/);
  assert.throws(() => resolveDiscretizedColorScale({
    type: "threshold",
    domain: [60, 60],
    range: ["a", "b", "c"],
    values
  }), /strictly increasing/);
  assert.throws(() => resolveDiscretizedColorScale({
    type: "threshold",
    domain: [60, 70],
    range: ["a", "b"],
    values
  }), /one more color/);
});

test("keeps tied quantile thresholds renderable and auto color count stable", () => {
  const tied = resolveDiscretizedColorScale({
    type: "quantile",
    domain: "auto",
    range: "auto",
    values: [1, 1, 1, 2, 2]
  });

  assert.equal(tied.range.length, 5);
  assert.equal(formatDiscretizedIntervals(tied.thresholds).length, 5);
});
