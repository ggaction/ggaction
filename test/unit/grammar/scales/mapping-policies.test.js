import assert from "node:assert/strict";
import test from "node:test";

import {
  mapDiscretizedColors,
  mapLinearValues,
  mapOrdinalPositionValues,
  mapOrdinalValues,
  mapSequentialColors,
  readScaleField,
  validateScaleUnknown
} from "../../../../src/grammar/scales.js";

test("normalizes invalid field inputs only when an unknown policy is active", () => {
  const rows = [
    { quantitative: 2, nominal: "a", temporal: "2001" },
    { quantitative: null, nominal: null, temporal: "not-a-date" },
    {}
  ];

  assert.deepEqual(
    readScaleField(rows, "quantitative", "quantitative", { allowUnknown: true }),
    [2, undefined, undefined]
  );
  assert.deepEqual(
    readScaleField(rows, "nominal", "nominal", { allowUnknown: true }),
    ["a", undefined, undefined]
  );
  assert.deepEqual(
    readScaleField(rows, "temporal", "temporal", { allowUnknown: true }),
    [Date.UTC(2001, 0, 1), undefined, undefined]
  );
  assert.throws(
    () => readScaleField(rows, "quantitative", "quantitative"),
    /finite number at row 1/
  );
  assert.throws(
    () => readScaleField(rows, "quantitative", "unsupported", {
      allowUnknown: true
    }),
    /Unsupported semantic field type/
  );
});

test("maps unknown values without adding them to continuous or ordinal domains", () => {
  assert.deepEqual(
    mapLinearValues([0, undefined, 10], [0, 10], [20, 120], { unknown: 5 }),
    [20, 5, 120]
  );
  assert.deepEqual(
    mapSequentialColors(
      [0, undefined, 10],
      [0, 10],
      ["#000000", "#ffffff"],
      { unknown: "#ff00ff" }
    ),
    ["#000000", "#ff00ff", "#ffffff"]
  );
  assert.deepEqual(
    mapDiscretizedColors([2, undefined, 8], {
      thresholds: [5],
      range: ["low", "high"],
      unknown: "missing"
    }),
    ["low", "missing", "high"]
  );
  assert.deepEqual(
    mapOrdinalValues(["a", "missing"], ["a"], ["red"], {
      unknown: "gray"
    }),
    ["red", "gray"]
  );
  assert.deepEqual(
    mapOrdinalPositionValues(["a", "missing"], {
      type: "point",
      domain: ["a"],
      range: [0, 100],
      step: 50,
      start: 25,
      bandwidth: 0,
      padding: 0.5,
      align: 0.5,
      unknown: 7
    }),
    [25, 7]
  );
});

test("validates fallback outputs against their concrete channel contract", () => {
  assert.equal(validateScaleUnknown("x", 10), 10);
  assert.equal(validateScaleUnknown("color", "gray"), "gray");
  assert.equal(validateScaleUnknown("size", 0), 0);
  assert.equal(validateScaleUnknown("opacity", 0.5), 0.5);
  assert.equal(validateScaleUnknown("shape", "diamond"), "diamond");
  assert.deepEqual(validateScaleUnknown("strokeDash", "dashed"), [6, 4]);

  assert.throws(() => validateScaleUnknown("y", NaN), /finite number/);
  assert.throws(() => validateScaleUnknown("color", ""), /non-empty/);
  assert.throws(() => validateScaleUnknown("size", -1), /non-negative/);
  assert.throws(() => validateScaleUnknown("opacity", 2), /between 0 and 1/);
  assert.throws(() => validateScaleUnknown("shape", "blob"), /Unsupported/);
  assert.throws(() => validateScaleUnknown("detail", 1), /not supported/);
});
