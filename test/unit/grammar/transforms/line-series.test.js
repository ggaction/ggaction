import assert from "node:assert/strict";
import test from "node:test";

import { deriveLineSeries } from "../../../../src/grammar/lineSeries.js";

const rows = [
  { year: "2021-01-01", value: 10, origin: "A" },
  { year: "2020-01-01", value: 2, origin: "A" },
  { year: "2020-01-01", value: 6, origin: "B" },
  { year: "2021-01-01", value: 14, origin: "B" }
];

function lineLayer(encoding = {}) {
  return {
    id: "trends",
    mark: { type: "line" },
    encoding: {
      x: { field: "year", fieldType: "temporal", scale: "x" },
      y: {
        field: "value",
        fieldType: "quantitative",
        aggregate: "mean",
        scale: "y"
      },
      ...encoding
    }
  };
}

test("aggregates mean values by temporal x into one sorted series", () => {
  const derived = deriveLineSeries(rows, lineLayer());

  assert.deepEqual(derived.series, [
    {
      key: {},
      values: [
        { x: Date.UTC(2020, 0, 1), y: 4 },
        { x: Date.UTC(2021, 0, 1), y: 12 }
      ]
    }
  ]);
  assert.deepEqual(derived.xValues, [
    Date.UTC(2020, 0, 1),
    Date.UTC(2021, 0, 1)
  ]);
  assert.deepEqual(derived.yValues, [4, 12]);
  assert.equal(Object.isFrozen(derived), true);
  assert.equal(Object.isFrozen(derived.series[0].values), true);
});

test("groups by each distinct series field and sorts every series", () => {
  const derived = deriveLineSeries(rows, lineLayer({
    color: { field: "origin", fieldType: "nominal", scale: "color" },
    strokeDash: {
      field: "origin",
      fieldType: "nominal",
      scale: "strokeDash"
    }
  }));

  assert.deepEqual(derived.series, [
    {
      key: { origin: "A" },
      values: [
        { x: Date.UTC(2020, 0, 1), y: 2 },
        { x: Date.UTC(2021, 0, 1), y: 10 }
      ]
    },
    {
      key: { origin: "B" },
      values: [
        { x: Date.UTC(2020, 0, 1), y: 6 },
        { x: Date.UTC(2021, 0, 1), y: 14 }
      ]
    }
  ]);
});

test("rejects incomplete encodings, invalid values, and one-point series", () => {
  assert.throws(
    () => deriveLineSeries(rows, {
      id: "trends",
      mark: { type: "line" },
      encoding: { x: lineLayer().encoding.x }
    }),
    /quantitative mean y encoding/
  );
  assert.throws(
    () => deriveLineSeries([{ year: "bad", value: 1 }], lineLayer()),
    /temporal string or finite timestamp/
  );
  assert.throws(
    () => deriveLineSeries([{ year: "2020-01-01", value: 1 }], lineLayer()),
    /at least two aggregate points/
  );
});
