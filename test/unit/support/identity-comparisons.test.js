import test from "node:test";
import assert from "node:assert/strict";
import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";

test("independent allocation comparisons retain dates, key declarations and concrete geometry", () => {
  const dataset = (logicalId, date) => ({ id: "rows", logicalId, revision: 0,
    values: [{ date }], keySpec: { mode: "field", field: "date" } });
  const first = dataset("one", new Date("2026-01-01"));
  assertEquivalentMeaning(first, dataset("two", new Date("2026-01-01")));
  assert.throws(() => assertEquivalentMeaning(first, dataset("two", new Date("2026-02-01"))), assert.AssertionError);
  assert.throws(() => assertEquivalentMeaning(first, { ...first, keySpec: { mode: "field", field: "other" } }), assert.AssertionError);
  assert.throws(() => assertEquivalentMeaning({ id: "mark", properties: { x: 1 } },
    { id: "mark", properties: { x: 2 } }), assert.AssertionError);
});
