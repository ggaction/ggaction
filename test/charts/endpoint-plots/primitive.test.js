import assert from "node:assert/strict";
import test from "node:test";
import {
  createDotPrimitive, createLollipopPrimitive, createDumbbellPrimitive
} from "./primitive.program.js";

test("authors endpoint targets without invoking their complete facades", () => {
  const programs = [createDotPrimitive(), createLollipopPrimitive(), createDumbbellPrimitive()];
  for (const program of programs) {
    const operations = JSON.stringify(program.trace);
    assert.doesNotMatch(operations, /create(?:Dot|Lollipop|Dumbbell)Plot/);
  }
  assert.equal(createDotPrimitive().graphicSpec.objects.dot.items.length, 3);
  assert.equal(createLollipopPrimitive().graphicSpec.objects.lollipopStem.items.length, 3);
  assert.equal(createDumbbellPrimitive().graphicSpec.objects.dumbbellConnector.items.length, 3);
});
