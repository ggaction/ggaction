import test from "node:test";
import assert from "node:assert/strict";
import { createLinearNiceCountPrimitives } from "./primitive.program.js";

test("explicit line vertices use the approved 0 to 110 domain", () => {
  const program = createLinearNiceCountPrimitives();
  const path = program.graphicSpec.objects.linePlot.items[0].properties;
  assert.deepEqual(path.commands, [
    { op: "M", x: 40, y: 140 },
    { op: "L", x: 140, y: 81.0909090909091 },
    { op: "L", x: 240, y: 22.181818181818187 }
  ]);
  assert.equal(path.stroke, "#4c78a8");
  assert.equal(path.strokeWidth, 2);
  assert(Object.isFrozen(path));
});
