import assert from "node:assert/strict";
import test from "node:test";

import {
  getPointGraphicType,
  validatePointShape
} from "../../src/core/markSchema.js";

test("maps the supported point shape to its graphic primitive", () => {
  assert.equal(validatePointShape("circle"), "circle");
  assert.equal(getPointGraphicType("circle"), "circle");
});

test("rejects unsupported point shapes", () => {
  assert.throws(() => validatePointShape("square"), /Unsupported point shape/);
  assert.throws(() => validatePointShape(undefined), /Unsupported point shape/);
});
