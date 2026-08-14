import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateScalarValues
} from "../../../../src/grammar/aggregate.js";
import {
  deriveCenteredAreaSeries
} from "../../../../src/grammar/areaSeries.js";
import { deriveArcSectors } from "../../../../src/grammar/arcs.js";
import {
  deriveKernelDensity,
  estimateDensityBandwidth
} from "../../../../src/grammar/density.js";
import { deriveRegression } from "../../../../src/grammar/regression/index.js";
import { layoutSeriesPartition } from "../../../../src/grammar/seriesLayout.js";
import {
  deriveWindowRows,
  normalizeWindowTransform
} from "../../../../src/grammar/window.js";

const MAX = Number.MAX_VALUE;

function assertFiniteTree(value, path = "result") {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `${path} must be finite`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteTree(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertFiniteTree(item, `${path}.${key}`);
    }
  }
}

test("keeps representable aggregate results finite at numeric extremes", () => {
  const results = {
    cancelledSum: aggregateScalarValues([MAX, MAX, -MAX], "sum"),
    largeMean: aggregateScalarValues([MAX / 2, MAX / 2, MAX / 2], "mean"),
    midpoint: aggregateScalarValues([-MAX, MAX], "median"),
    populationDeviation: aggregateScalarValues([-MAX, MAX], "stdevP"),
    standardError: aggregateScalarValues([-MAX, MAX], "stderr")
  };

  assert.deepEqual(results, {
    cancelledSum: MAX,
    largeMean: MAX / 2,
    midpoint: 0,
    populationDeviation: MAX,
    standardError: MAX
  });
  assertFiniteTree(results);
  assert.throws(
    () => aggregateScalarValues([-MAX, MAX], "varianceP"),
    /outside the finite numeric range/
  );
  assert.throws(
    () => aggregateScalarValues([-MAX, MAX], "ciUpper"),
    /outside the finite numeric range/
  );
});

test("stabilizes moving means and rejects unrepresentable window outputs", () => {
  const meanTransform = normalizeWindowTransform({
    operations: [{
      op: "movingMean",
      field: "value",
      as: "mean",
      frame: { preceding: 2 }
    }]
  });
  const means = deriveWindowRows([
    { value: MAX / 2 },
    { value: MAX / 2 },
    { value: MAX / 2 }
  ], meanTransform);

  assert.deepEqual(means.map(row => row.mean), [MAX / 2, MAX / 2, MAX / 2]);
  assertFiniteTree(means);
  assert.throws(() => deriveWindowRows(
    [{ value: MAX }, { value: MAX }],
    normalizeWindowTransform({
      operations: [{ op: "cumulativeSum", field: "value", as: "sum" }]
    })
  ), /cumulativeSum output "sum" must be finite/);
  assert.throws(() => deriveWindowRows(
    [{ value: MAX }, { value: MAX }],
    normalizeWindowTransform({
      operations: [{
        op: "movingSum",
        field: "value",
        as: "sum",
        frame: { preceding: 1 }
      }]
    })
  ), /movingSum output "sum" must be finite/);
});

test("partitions extreme arc weights by normalized finite ratios", () => {
  const result = deriveArcSectors([
    { category: "A", weight: MAX },
    { category: "B", weight: MAX }
  ], {
    id: "arcs",
    mark: { type: "arc" },
    encoding: {
      theta: {
        field: "category",
        fieldType: "nominal",
        aggregate: "sum",
        weight: "weight",
        scale: "theta"
      }
    }
  }, {
    thetaScale: {
      type: "band",
      domain: ["A", "B"],
      range: [0, 360],
      bandwidth: 180
    },
    frame: { availableRadius: 80 }
  });

  assert.deepEqual(
    result.sectors.map(sector => [sector.startTheta, sector.endTheta]),
    [[0, 180], [180, 360]]
  );
  assertFiniteTree(result);
});

test("builds finite density grids across the complete finite range", () => {
  const result = deriveKernelDensity([
    { value: -MAX },
    { value: MAX }
  ], {
    field: "value",
    bandwidth: MAX,
    extent: [-MAX, MAX],
    steps: 3,
    as: ["sample", "density"]
  });

  assert.deepEqual(result.samples, [-MAX, 0, MAX]);
  assert.equal(result.values.every(row => row.density >= 0), true);
  assertFiniteTree(result);

  const high = MAX / 2;
  const bandwidth = estimateDensityBandwidth([
    high,
    high,
    high,
    high,
    high * (1 - Number.EPSILON)
  ]);
  assert.equal(Number.isFinite(bandwidth) && bandwidth > 0, true);

  assert.throws(() => deriveKernelDensity([{ value: 1 }], {
    field: "value",
    bandwidth: 1,
    extent: [1, 1 + Number.EPSILON],
    steps: 3
  }), /cannot represent the requested finite sample grid/);
});

test("keeps every regression method finite for representable extreme fits", () => {
  const linear = deriveRegression([0, 1, 2].map(x => ({ x, y: MAX / 2 })), {
    x: "x",
    y: "y",
    method: "linear"
  });
  const polynomial = deriveRegression([0, 1, 2, 3].map(x => ({
    x,
    y: MAX / 2
  })), {
    x: "x",
    y: "y",
    method: "polynomial"
  });
  const loess = deriveRegression([
    { x: -MAX, y: 1 },
    { x: 0, y: 2 },
    { x: MAX, y: 3 }
  ], {
    x: "x",
    y: "y",
    method: "loess",
    span: 1
  });
  const fullRangeLinear = deriveRegression([
    { x: -MAX, y: 1 },
    { x: 0, y: 2 },
    { x: MAX, y: 3 }
  ], {
    x: "x",
    y: "y",
    method: "linear"
  });
  const asymmetricRangeLinear = deriveRegression([
    { x: -MAX, y: 1 },
    { x: -MAX, y: 1 },
    { x: MAX, y: 3 }
  ], {
    x: "x",
    y: "y",
    method: "linear"
  });
  const fullRangePolynomial = deriveRegression([
    { x: -MAX, y: -1 },
    { x: MAX, y: 1 },
    { x: MAX / 2, y: 0.5 },
    { x: 0, y: 0 }
  ], {
    x: "x",
    y: "y",
    method: "polynomial",
    degree: 2
  });

  assert.deepEqual(linear.values.map(row => row.y), [MAX / 2, MAX / 2, MAX / 2]);
  assert.deepEqual(
    polynomial.values.map(row => row.y),
    [MAX / 2, MAX / 2, MAX / 2, MAX / 2]
  );
  assert.deepEqual(loess.values.map(row => row.y), [1, 2, 3]);
  assertFiniteTree(linear);
  assertFiniteTree(polynomial);
  assertFiniteTree(loess);
  assertFiniteTree(fullRangeLinear);
  assertFiniteTree(asymmetricRangeLinear);
  assertFiniteTree(fullRangePolynomial);
  fullRangePolynomial.values.forEach(row => {
    assert.ok(Math.abs(row.y - row.x / MAX) < 1e-12);
  });
  assert.equal(
    fullRangePolynomial.models[0].coefficients.every(Number.isFinite),
    true
  );
});

test("normalizes finite fills and centers while rejecting impossible endpoints", () => {
  const fill = layoutSeriesPartition([MAX, MAX], "fill");
  const center = layoutSeriesPartition([MAX, MAX], "center");

  assert.deepEqual(fill.map(segment => [segment.start, segment.end]), [
    [0, 0.5],
    [0.5, 1]
  ]);
  assert.deepEqual(center.map(segment => [segment.start, segment.end]), [
    [-MAX, 0],
    [0, MAX]
  ]);
  assertFiniteTree(fill);
  assertFiniteTree(center);
  assert.throws(
    () => layoutSeriesPartition([MAX, MAX], "stack"),
    /outside the finite numeric range/
  );
  assert.throws(
    () => layoutSeriesPartition([MAX, MAX], "diverging"),
    /outside the finite numeric range/
  );

  const centeredArea = deriveCenteredAreaSeries([
    { x: 0, group: "zero", value: 0 },
    { x: 1, group: "zero", value: 0 },
    { x: 0, group: "left", value: MAX },
    { x: 1, group: "left", value: MAX },
    { x: 0, group: "right", value: MAX },
    { x: 1, group: "right", value: MAX }
  ], {
    id: "area",
    mark: { type: "area" },
    encoding: {
      x: { field: "x", fieldType: "quantitative" },
      y: { field: "value", fieldType: "quantitative", stack: "center" },
      group: { field: "group", fieldType: "nominal" }
    }
  });
  assertFiniteTree(centeredArea);
  assert.deepEqual(centeredArea.series[0].values.map(value => value.lower), [
    -MAX,
    -MAX
  ]);
});
