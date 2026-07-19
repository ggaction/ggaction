import assert from "node:assert/strict";
import test from "node:test";

import { deriveKernelDensity } from "../../../../src/grammar/density.js";
import {
  countHistogramBins,
  resolveHistogramBins
} from "../../../../src/grammar/histogram.js";
import {
  REGRESSION_LOWER_FIELD,
  REGRESSION_UPPER_FIELD,
  deriveLinearRegression
} from "../../../../src/grammar/regression/index.js";
import { mapLinearValues } from "../../../../src/grammar/scales/index.js";

function trapezoidIntegral(points) {
  return points.slice(1).reduce((sum, point, index) => {
    const previous = points[index];
    return sum + (point.x - previous.x) * (point.y + previous.y) / 2;
  }, 0);
}

test("keeps linear mappings monotonic and reverses them exactly", () => {
  const values = [-5, -1, 0, 3, 10];
  const forward = mapLinearValues(values, [-5, 10], [20, 320]);
  const reverse = mapLinearValues(values, [-5, 10], [320, 20]);

  assert.equal(forward.every((value, index) => index === 0 || value > forward[index - 1]), true);
  assert.equal(reverse.every((value, index) => index === 0 || value < reverse[index - 1]), true);
  assert.deepEqual(
    reverse,
    forward.map(value => 340 - value)
  );
});

test("assigns every in-domain value to exactly one histogram bin", () => {
  const values = [-2, -1.5, -1, 0, 0.5, 1, 1.5, 2];
  const bins = resolveHistogramBins({
    values,
    maxBins: 4,
    domain: [-2, 2],
    nice: false
  });
  const counts = countHistogramBins(values, bins.boundaries);

  assert.equal(counts.reduce((sum, count) => sum + count, 0), values.length);
  assert.equal(bins.boundaries.length, 5);
  assert.equal(bins.boundaries.every(
    (value, index) => index === 0 || value > bins.boundaries[index - 1]
  ), true);
});

test("produces non-negative density values with approximately unit area", () => {
  const density = deriveKernelDensity(
    [{ value: -1 }, { value: 0 }, { value: 1 }],
    {
      field: "value",
      bandwidth: 0.5,
      extent: [-5, 5],
      steps: 501,
      as: ["sample", "density"]
    }
  );
  const points = density.values.map(row => ({
    x: row.sample,
    y: row.density
  }));

  assert.equal(points.every(point => point.y >= 0), true);
  assert.equal(points.every(
    (point, index) => index === 0 || point.x > points[index - 1].x
  ), true);
  assert.equal(Math.abs(trapezoidIntegral(points) - 1) < 1e-6, true);
});

test("keeps grouped regression predictions ordered inside their intervals", () => {
  const regression = deriveLinearRegression([
    { group: "b", x: 0, y: 1 },
    { group: "b", x: 1, y: 2.2 },
    { group: "b", x: 2, y: 2.8 },
    { group: "a", x: 0, y: 2 },
    { group: "a", x: 1, y: 2.7 },
    { group: "a", x: 2, y: 4.1 }
  ], { x: "x", y: "y", groupBy: "group" });

  assert.deepEqual(regression.groups, ["b", "a"]);
  for (const group of regression.groups) {
    const rows = regression.values.filter(row => row.group === group);
    assert.deepEqual(rows.map(row => row.x), [0, 1, 2]);
    assert.equal(rows.every(row =>
      row[REGRESSION_LOWER_FIELD] <= row.y &&
      row.y <= row[REGRESSION_UPPER_FIELD]
    ), true);
  }
});
