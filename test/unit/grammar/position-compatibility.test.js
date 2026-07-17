import assert from "node:assert/strict";
import test from "node:test";

import {
  POSITION_FIELD_COMPATIBILITY,
  validatePositionFieldCompatibility
} from "../../../src/grammar/positionCompatibility.js";

test("owns the accepted mark, channel, and field-type matrix", () => {
  assert.deepEqual(POSITION_FIELD_COMPATIBILITY.point.x, [
    "quantitative", "temporal", "ordinal", "nominal"
  ]);
  assert.equal(validatePositionFieldCompatibility("bar", "x", "temporal"), "temporal");
  assert.equal(validatePositionFieldCompatibility("bar", "y", "ordinal"), "ordinal");
  assert.equal(
    validatePositionFieldCompatibility("area", "x", "temporal"),
    "temporal"
  );
  assert.equal(
    validatePositionFieldCompatibility("area", "y", "temporal"),
    "temporal"
  );
  assert.equal(
    validatePositionFieldCompatibility("point", "x", "nominal"),
    "nominal"
  );
  assert.equal(
    validatePositionFieldCompatibility("point", "theta", "temporal"),
    "temporal"
  );
  assert.equal(
    validatePositionFieldCompatibility("point", "radius", "quantitative"),
    "quantitative"
  );
  assert.throws(
    () => validatePositionFieldCompatibility("point", "radius", "nominal"),
    /does not support/
  );
});
