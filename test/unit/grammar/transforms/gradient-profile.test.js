import assert from "node:assert/strict";
import test from "node:test";

import {
  GRADIENT_PROFILE_FIELDS,
  deriveGradientProfiles,
  normalizeGradientProfileTransform,
  requestedGradientProfileTransform,
  validateGradientProfileTransform
} from "../../../../src/grammar/gradientProfile.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", value: 1 }),
  Object.freeze({ group: "B", value: 4 }),
  Object.freeze({ group: "A", value: 2 }),
  Object.freeze({ group: "B", value: 6 }),
  Object.freeze({ group: "A", value: 3 })
]);

test("derives one immutable profile row per first-appearance category", () => {
  const transform = normalizeGradientProfileTransform({
    category: "group",
    field: "value",
    bandwidth: 0.5,
    steps: 5
  });
  const result = deriveGradientProfiles(rows, transform);

  assert.deepEqual(result.categories, ["A", "B"]);
  assert.equal(result.values.length, 2);
  assert.deepEqual(result.extent, [1, 6]);
  assert.deepEqual(result.values.map(row => row[GRADIENT_PROFILE_FIELDS.count]), [3, 2]);
  assert.deepEqual(result.values.map(row => row[GRADIENT_PROFILE_FIELDS.center]), [2, 5]);
  assert.equal(result.values.every(row =>
    row[GRADIENT_PROFILE_FIELDS.values].length === 5 &&
    row[GRADIENT_PROFILE_FIELDS.intensities].length === 5 &&
    !Object.hasOwn(row, "fill") && !Object.hasOwn(row, "paint")
  ), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.values[0][GRADIENT_PROFILE_FIELDS.values]), true);
});

test("keeps requested auto intent separate from resolved provenance", () => {
  const requested = normalizeGradientProfileTransform({
    category: "group",
    field: "value"
  });
  const materialized = {
    ...requested,
    resolved: {
      bandwidth: 0.75,
      extent: [1, 6],
      intensityDomain: [0, 0.5]
    }
  };

  assert.equal(validateGradientProfileTransform(materialized), materialized);
  assert.deepEqual(requestedGradientProfileTransform(materialized), requested);
  assert.equal(requested.bandwidth, "auto");
  assert.equal(requested.extent, "auto");
});

test("rejects invalid profile topology and provenance", () => {
  assert.throws(
    () => normalizeGradientProfileTransform({ category: "value", field: "value" }),
    /must be distinct/
  );
  assert.throws(
    () => normalizeGradientProfileTransform({ category: "group", field: "value", steps: 1 }),
    /at least 2/
  );
  assert.throws(
    () => validateGradientProfileTransform({
      ...normalizeGradientProfileTransform({ category: "group", field: "value" }),
      resolved: { bandwidth: 1, extent: [1, 6], intensityDomain: [0, 0] }
    }),
    /intensityDomain/
  );
});
