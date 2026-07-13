import assert from "node:assert/strict";
import test from "node:test";

import { validateUserId } from "../../../src/core/identifiers.js";

test("accepts user-defined IDs with supported characters", () => {
  assert.equal(validateUserId("cars"), "cars");
  assert.equal(validateUserId("cars_2026-fit"), "cars_2026-fit");
});

test("rejects empty and malformed user-defined IDs", () => {
  assert.throws(() => validateUserId(""), /must not be empty/);
  assert.throws(() => validateUserId("cars data"), /letters, numbers/);
  assert.throws(() => validateUserId("cars.data"), /letters, numbers/);
  assert.throws(() => validateUserId(3), /letters, numbers/);
});
