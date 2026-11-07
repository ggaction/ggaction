import test from "node:test";
import assert from "node:assert/strict";
import { createTablePrimitive } from "./primitive.program.js";
test("Table primitive fixes cell clipping, zero-aligned bar lengths, shared sparkline scales and source sum", () => {
  const objects = createTablePrimitive().graphicSpec.objects;
  assert.deepEqual(objects["cell-4"].clip, { x: 120, y: 48, width: 100, height: 28 });
  assert.deepEqual([objects["cell-4"].items[1].properties.width, objects["cell-7"].items[1].properties.width], [46, 92]);
  assert.deepEqual(objects["cell-5"].items[1].properties.commands.map(({x,y}) => [x,y]), [[224,72],[280,52],[336,62]]);
  assert.equal(objects["cell-10"].items[1].properties.text, "12");
  assert.equal(objects.table.children.length, 12);
});
