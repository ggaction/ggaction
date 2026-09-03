import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveArcSectors,
  readArcThetaValues,
  readArcThetaWeights
} from "../../../src/grammar/arcs.js";

const frame = Object.freeze({ centerX: 100, centerY: 100, availableRadius: 80 });

const thetaScale = Object.freeze({
  type: "band",
  domain: Object.freeze(["A", "B", "C"]),
  range: Object.freeze([0, 360]),
  step: 120,
  start: 0,
  bandwidth: 120,
  paddingInner: 0,
  paddingOuter: 0,
  align: 0.5
});

test("derives repeated and fractional weighted theta sectors without expanding rows", () => {
  const rows = Object.freeze([
    Object.freeze({ category: "A", weight: 0.5 }),
    Object.freeze({ category: "B", weight: 1.5 }),
    Object.freeze({ category: "A", weight: 1 }),
    Object.freeze({ category: "C", weight: 0 })
  ]);
  const layer = {
    id: "arc",
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
  };
  const derived = deriveArcSectors(rows, layer, { thetaScale, frame });

  assert.equal(Object.isFrozen(derived), true);
  assert.deepEqual(derived.sectors.map(sector => ({
    key: sector.key,
    count: sector.count,
    aggregateValue: sector.aggregateValue,
    startTheta: sector.startTheta,
    endTheta: sector.endTheta,
    sourceIndices: sector.sourceIndices
  })), [
    {
      key: "A",
      count: 2,
      aggregateValue: 1.5,
      startTheta: 0,
      endTheta: 180,
      sourceIndices: [0, 2]
    },
    {
      key: "B",
      count: 1,
      aggregateValue: 1.5,
      startTheta: 180,
      endTheta: 360,
      sourceIndices: [1]
    }
  ]);
  assert.equal(rows.length, 4);
});

test("derives one proportional sector per positive quantitative theta row", () => {
  const rows = Object.freeze([
    Object.freeze({ category: "A", value: 2 }),
    Object.freeze({ category: "A", value: 1 }),
    Object.freeze({ category: "B", value: 3 }),
    Object.freeze({ category: "B", value: 0 })
  ]);
  const layer = {
    id: "arc",
    mark: { type: "arc" },
    encoding: {
      theta: {
        field: "value",
        fieldType: "quantitative",
        scale: "theta"
      },
      color: {
        field: "category",
        fieldType: "nominal",
        scale: "color"
      }
    }
  };
  const derived = deriveArcSectors(rows, layer, {
    thetaScale: { type: "linear", domain: [0, 3], range: [0, 360] },
    frame,
    innerRadiusRatio: 0.25
  });

  assert.deepEqual(derived.sectors.map(sector => ({
    theta: sector.theta,
    color: sector.color,
    startTheta: sector.startTheta,
    endTheta: sector.endTheta,
    innerRadius: sector.innerRadius,
    outerRadius: sector.outerRadius,
    sourceIndices: sector.sourceIndices
  })), [
    {
      theta: 2,
      color: "A",
      startTheta: 0,
      endTheta: 120,
      innerRadius: 20,
      outerRadius: 80,
      sourceIndices: [0]
    },
    {
      theta: 1,
      color: "A",
      startTheta: 120,
      endTheta: 180,
      innerRadius: 20,
      outerRadius: 80,
      sourceIndices: [1]
    },
    {
      theta: 3,
      color: "B",
      startTheta: 180,
      endTheta: 360,
      innerRadius: 20,
      outerRadius: 80,
      sourceIndices: [2]
    }
  ]);
});

test("keeps proportional sectors finite across the full numeric theta range", () => {
  const range = [-Number.MAX_VALUE, Number.MAX_VALUE];
  const scale = {
    ...thetaScale,
    domain: ["A", "B"],
    range,
    step: Number.MAX_VALUE,
    bandwidth: Number.MAX_VALUE
  };
  const layer = {
    id: "arc",
    mark: { type: "arc" },
    encoding: {
      theta: {
        field: "category",
        fieldType: "nominal",
        aggregate: "count",
        scale: "theta"
      }
    }
  };
  const { sectors } = deriveArcSectors(
    [{ category: "A" }, { category: "B" }],
    layer,
    { thetaScale: scale, frame }
  );

  assert.deepEqual(sectors.map(sector => [sector.startTheta, sector.endTheta]), [
    [range[0], 0],
    [0, range[1]]
  ]);
  assert.equal(
    sectors.every(sector =>
      Number.isFinite(sector.startTheta) && Number.isFinite(sector.endTheta)
    ),
    true
  );
});

test("rejects invalid weighted theta values and a zero total", () => {
  for (const value of [-1, Infinity, NaN, undefined, "2"]) {
    assert.throws(
      () => readArcThetaWeights([{ weight: value }], "weight", "arc"),
      /non-negative finite numbers at row 0/
    );
  }
  assert.throws(
    () => readArcThetaWeights([{ weight: 0 }, { weight: 0 }], "weight", "arc"),
    /positive total/
  );
});

test("rejects invalid direct quantitative theta values and a zero total", () => {
  for (const value of [-1, Infinity, NaN, undefined, "2"]) {
    assert.throws(
      () => readArcThetaValues([{ value }], "value", "arc"),
      /non-negative finite numbers at row 0/
    );
  }
  assert.throws(
    () => readArcThetaValues([{ value: 0 }, { value: 0 }], "value", "arc"),
    /positive total/
  );
});

test("derives stable larger-first radial sectors at final item grain", () => {
  const rows = [
    { month: "A", value: 2, cause: "small" },
    { month: "A", value: 6, cause: "large" },
    { month: "B", value: 0, cause: "small" }
  ];
  const layer = {
    id: "arc",
    mark: { type: "arc" },
    encoding: {
      theta: { field: "month", fieldType: "ordinal", scale: "theta" },
      radius: { field: "value", fieldType: "quantitative", scale: "radius" },
      color: { field: "cause", fieldType: "nominal", scale: "color", layout: "overlay" }
    }
  };
  const derived = deriveArcSectors(rows, layer, {
    thetaScale: {
      type: "band",
      domain: ["A", "B"],
      range: [-90, 270],
      step: 180,
      start: -90,
      bandwidth: 180,
      paddingInner: 0,
      paddingOuter: 0,
      align: 0.5
    },
    radiusScale: { type: "linear", domain: [0, 8], range: [0, 80] },
    frame
  });

  assert.equal(Object.isFrozen(derived), true);
  assert.deepEqual(derived.sectors.map(sector => sector.color), ["large", "small"]);
  assert.deepEqual(derived.sectors.map(sector => sector.outerRadius), [60, 20]);
  assert.deepEqual(derived.sectors.map(sector => sector.sourceIndices), [[1], [0]]);
});
