import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveArcSectors,
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
