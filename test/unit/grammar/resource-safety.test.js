import assert from "node:assert/strict";
import test from "node:test";

import { aggregateScalarValues } from "../../../src/grammar/aggregate.js";
import { deriveKernelDensity } from "../../../src/grammar/density.js";
import { normalizeGradientProfileTransform } from
  "../../../src/grammar/gradientProfile.js";
import { deriveGradientProfiles } from
  "../../../src/grammar/gradientProfile.js";
import { resolveHistogramBins } from "../../../src/grammar/histogram.js";
import {
  deriveHorizon,
  validateHorizonTransform
} from "../../../src/grammar/horizon.js";
import {
  deriveInterval,
  normalizeIntervalTransform
} from "../../../src/grammar/interval.js";
import { normalizePalette, resolvePalette } from
  "../../../src/grammar/palettes.js";
import { normalizeRegressionParameters } from
  "../../../src/grammar/regression/parameters.js";
import { deriveRegression } from
  "../../../src/grammar/regression/derive.js";
import { resolveTransformedDomain } from
  "../../../src/grammar/scales/transformed.js";
import { timeTicks } from "../../../src/grammar/ticks.js";
import { chart } from "../../../src/index.js";

const LARGE_VALUES = Array.from({ length: 200_000 }, (_, index) => index + 1);
const LARGE_ROWS = Array.from({ length: 200_000 }, (_, index) => ({
  x: index % 10_000,
  y: index % 10_000 + 1
}));

function horizonTransform(overrides = {}) {
  return {
    type: "horizon",
    x: { field: "x", fieldType: "quantitative" },
    y: { field: "y", fieldType: "quantitative" },
    bands: 2,
    baseline: 0,
    extent: "auto",
    resolve: "shared",
    missing: "break",
    overflow: "clip",
    palette: {},
    as: {
      x: "hx", lower: "hl", upper: "hu", group: "hg",
      color: "hc", sign: "hs", band: "hb", segment: "hseg"
    },
    ...overrides
  };
}

test("keeps large finite extents stack-safe across aggregates, bins, and transforms", () => {
  assert.equal(aggregateScalarValues(LARGE_VALUES, "min"), 1);
  assert.equal(aggregateScalarValues(LARGE_VALUES, "max"), 200_000);
  const histogram = resolveHistogramBins({
    values: LARGE_VALUES,
    bin: { step: 1_000 }
  });
  assert.deepEqual(histogram.domain, [0, 200_000]);
  assert.equal(histogram.boundaries.length, 201);
  assert.deepEqual(resolveTransformedDomain({
    type: "sqrt",
    values: LARGE_VALUES
  }), [1, 200_000]);
});

test("rejects generated grids and palettes above the shared item limit", () => {
  assert.throws(() => timeTicks([0, 1], 10_001), /must not exceed 10000/);
  assert.throws(
    () => normalizePalette({ name: "viridis", count: 10_001 }),
    /must not exceed 10000/
  );
  assert.throws(() => resolvePalette("viridis", 10_001), /must not exceed 10000/);
  assert.throws(
    () => deriveKernelDensity([{ value: 1 }], {
      field: "value",
      bandwidth: 1,
      extent: [0, 2],
      steps: 10_001
    }),
    /must not exceed 10000/
  );
  assert.throws(
    () => normalizeGradientProfileTransform({
      category: "group",
      field: "value",
      steps: 10_001
    }),
    /must not exceed 10000/
  );
});

test("adapts long time ranges and rejects multiplicative model parameters", () => {
  const timestamp = year => {
    const value = new Date(0);
    value.setUTCFullYear(year, 0, 1);
    value.setUTCHours(0, 0, 0, 0);
    return value.getTime();
  };
  assert.deepEqual(
    timeTicks([timestamp(0), timestamp(200_000)], 5).map(value =>
      new Date(value).getUTCFullYear()
    ),
    [0, 50_000, 100_000, 150_000, 200_000]
  );
  assert.throws(
    () => validateHorizonTransform(horizonTransform({ bands: 10_001 })),
    /must not exceed 10000/
  );
  assert.throws(
    () => normalizeRegressionParameters({ method: "polynomial", degree: 33 }),
    /must not exceed 32/
  );
});

test("bounds multiplied density and Horizon output before materialization", () => {
  assert.throws(
    () => deriveGradientProfiles([
      { group: "A", value: 1 },
      { group: "B", value: 2 }
    ], normalizeGradientProfileTransform({
      category: "group",
      field: "value",
      bandwidth: 1,
      extent: [0, 3],
      steps: 5_001
    })),
    /Density generated row count must not exceed 10000/
  );
  assert.throws(
    () => deriveKernelDensity([
      { group: "A", value: 1 },
      { group: "B", value: 2 }
    ], {
      field: "value",
      groupBy: "group",
      bandwidth: 1,
      extent: [0, 3],
      steps: 5_001
    }),
    /Density generated row count must not exceed 10000/
  );
  assert.throws(
    () => deriveHorizon(
      [{ x: 0, y: 1 }, { x: 1, y: 1 }],
      horizonTransform({ bands: 10_000 })
    ),
    /Horizon generated row count must not exceed 10000/
  );
});

test("rejects excessive density and regression computation before fitting", () => {
  assert.throws(
    () => deriveKernelDensity(LARGE_ROWS, {
      field: "y",
      bandwidth: 1,
      extent: [0, 10_000],
      steps: 100
    }),
    /Density computation must not exceed 10000000/
  );
  assert.throws(
    () => deriveRegression(LARGE_ROWS, {
      x: "x", y: "y", method: "loess"
    }),
    /Regression computation must not exceed 10000000/
  );
  assert.throws(
    () => deriveRegression(LARGE_ROWS, {
      x: "x", y: "y", method: "polynomial", degree: 32
    }),
    /Regression computation must not exceed 10000000/
  );
});

test("bounds Cartesian category-by-series layout cells", () => {
  const categories = Array.from({ length: 101 }, (_, index) => `c${index}`);
  const colors = Array.from({ length: 101 }, (_, index) => `g${index}`);
  assert.throws(
    () => chart()
      .createCanvas({ width: 300, height: 200, margin: 20 })
      .createData({ values: colors.map((group, index) => ({ category: categories[index], group, value: 1 })) })
      .createBarMark()
      .encodeX({
        field: "category",
        fieldType: "ordinal",
        scale: { domain: categories }
      })
      .encodeY({ field: "value", aggregate: "sum" })
      .encodeColor({
        field: "group",
        layout: "stack",
        scale: { domain: colors }
      }),
    /Aggregate layout cell count must not exceed 10000/
  );
});

test("keeps Horizon crossings finite and rejects unrepresentable intervals", () => {
  const horizon = deriveHorizon([
    { x: -1e308, y: -1e308 },
    { x: 1e308, y: 1e308 }
  ], horizonTransform());
  const crossings = horizon.series.flatMap(series =>
    series.points.filter(point => point.interpolated)
  );
  assert.equal(crossings.length > 0, true);
  assert.equal(crossings.every(point => point.x === 0), true);
  assert.throws(
    () => deriveHorizon(
      [{ x: 0, y: 1e308 }],
      horizonTransform({ baseline: -1e308 })
    ),
    /Horizon signed deviation is outside the finite numeric range/
  );

  const interval = normalizeIntervalTransform({
    field: "value",
    center: "mean",
    extent: "ci",
    level: 0.95,
    as: { center: "center", lower: "lower", upper: "upper" }
  });
  assert.throws(
    () => deriveInterval([{ value: -1e308 }, { value: 1e308 }], interval),
    /Interval (lower|upper) endpoint is outside the finite numeric range/
  );
});
