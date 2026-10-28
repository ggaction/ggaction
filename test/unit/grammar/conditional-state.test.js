import test from "node:test";
import assert from "node:assert/strict";
import { validateStoredConditional } from "../../../src/grammar/conditionalState.js";

const expression = { version: 2, registry: "standard@1", root: { type: "literal", value: true } };
const stored = value => ({ conditions: [{ when: expression, value }], otherwise: value, parameterInputs: [], selectionInputs: [] });

test("inactive stored branches cannot change channel units or field and scale roles", () => {
  for (const [channel, invalid, pattern] of [
    ["opacity", { field: "x", fieldType: "quantitative", scale: "s", aggregate: "sum" }, /Only conditional color/],
    ["shape", { field: "x", fieldType: "quantitative", scale: "s" }, /nominal/],
    ["size", { field: "x", fieldType: "temporal", scale: "s" }, /quantitative or categorical/],
    ["strokeDash", { field: "x", fieldType: "quantitative", scale: "s" }, /categorical/],
    ["color", { field: "x", fieldType: "quantitative", scale: "s", temporalUnit: "timestamp" }, /temporal/],
    ["angle", { value: Infinity }, /finite/]
  ]) {
    const definition = stored({ value: channel === "shape" ? "circle" : channel === "strokeDash" ? [] : channel === "color" ? "red" : 0 });
    definition.otherwise = invalid;
    assert.throws(() => validateStoredConditional(channel, definition), pattern);
  }
});

test("stored selection dependency vectors require the exact declared identity and revision shape", () => {
  const definition = stored({ value: 0 });
  definition.conditions[0].when = { selection: "chosen" };
  const reference = { selection: "chosen", kind: "persistent-selection", id: "resource", revision: 0 };
  assert.throws(() => validateStoredConditional("opacity", definition), /exactly match/);
  for (const mutation of [{ kind: "parameter" }, { selection: "other" }, { revision: -1 }, { revision: 0.5 }]) {
    assert.throws(() => validateStoredConditional("opacity", { ...definition, selectionInputs: [{ ...reference, ...mutation }] }), /kind|order|revision/);
  }
  assert.doesNotThrow(() => validateStoredConditional("opacity", { ...definition, selectionInputs: [reference] }));
});
