import test from "node:test";
import assert from "node:assert/strict";
import { createMidpointPrimitive, createClearedPrimitive } from "./primitive.program.js";
test("keeps midpoint intent in one semantic leaf and removes it explicitly", () => {
  assert.equal(createMidpointPrimitive().semanticSpec.scales.find(x => x.id === "colors").midpoint, 0);
  assert.equal(Object.hasOwn(createClearedPrimitive().resolvedScales.colors, "midpoint"), false);
});
