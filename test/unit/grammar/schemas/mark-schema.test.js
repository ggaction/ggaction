import assert from "node:assert/strict";
import test from "node:test";

import {
  getPointGraphicType,
  validatePointShape
} from "../../../../src/grammar/schemas/mark.js";

test("maps the supported point shape to its graphic primitive", () => {
  assert.equal(validatePointShape("circle"), "circle");
  assert.equal(getPointGraphicType("circle"), "circle");
  assert.equal(validatePointShape("square"), "square");
  assert.equal(getPointGraphicType("square"), "rect");
});

test("rejects unsupported point shapes", () => {
  assert.throws(() => validatePointShape("triangle"), /Unsupported point shape/);
  assert.throws(() => validatePointShape(undefined), /Unsupported point shape/);
});
