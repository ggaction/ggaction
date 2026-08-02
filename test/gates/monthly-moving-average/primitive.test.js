import assert from "node:assert/strict";
import test from "node:test";

import { createAirlinePassengerMovingWindowPrimitives } from
  "./primitive.program.js";

test("authors three actual-data moving-window targets without future actions", () => {
  const program = createAirlinePassengerMovingWindowPrimitives();
  assert.deepEqual(Object.keys(program.children), [
    "trailingMean", "centeredMean", "trailingSum"
  ]);
  for (const child of Object.values(program.children)) {
    assert.equal(child.graphicSpec.objects.moving.items[0].properties.commands.length, 24);
    assert.equal(
      child.trace.children.some(node => node.op === "createWindowData"),
      false
    );
  }
  assert.deepEqual(program.children.trailingMean.resolvedScales.y.domain, [60, 100]);
  assert.deepEqual(program.children.centeredMean.resolvedScales.y.domain, [60, 100]);
  assert.deepEqual(program.children.trailingSum.resolvedScales.y.domain, [0, 280]);
});
