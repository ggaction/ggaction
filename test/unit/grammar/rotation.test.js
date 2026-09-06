import assert from "node:assert/strict";
import test from "node:test";

import { resolveRotation } from "../../../src/grammar/rotation.js";

test("resolves legacy radians and explicit degree or radian rotations", () => {
  assert.equal(resolveRotation(Math.PI / 2), Math.PI / 2);
  assert.equal(resolveRotation({ value: 90, unit: "degrees" }), Math.PI / 2);
  assert.equal(resolveRotation({ value: Math.PI / 2, unit: "radians" }), Math.PI / 2);
});

test("rejects ambiguous or malformed rotation values", () => {
  for (const value of [Infinity, { value: 90 }, { value: 90, unit: "turns" },
    { value: Infinity, unit: "degrees" }, { value: 90, unit: "degrees", extra: true }]) {
    assert.throws(() => resolveRotation(value), /finite legacy number or/);
  }
});
