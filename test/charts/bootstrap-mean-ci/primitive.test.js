import assert from "node:assert/strict";
import test from "node:test";
import { expectedRows, areaCommands, lineCommands } from "./reference-values.js";
import { createBootstrapMeanPrimitive } from "./primitive.program.js";
test("anchors asymmetric literal endpoints and an independently mapped blue band and line", () => {
  assert.equal(expectedRows[0].upper, 18.4);
  assert.equal(expectedRows.at(-1).lower, 2.2);
  assert.ok(expectedRows.every(row => row.lower < row.mean && row.mean < row.upper));
  assert.ok(expectedRows.every(row => Math.abs((row.lower + row.upper) / 2 - row.mean) > 1));
  assert.equal(areaCommands.length, 11);
  assert.equal(lineCommands.length, 5);
  assert.equal(areaCommands[0].x, 20);
  assert.equal(lineCommands[0].y, 170.3);
  const p = createBootstrapMeanPrimitive();
  assert.ok(p.trace.children.every(node => ["createGraphics", "editGraphics"].includes(node.op)));
  assert.equal(p.graphicSpec.objects.areaPlot.items[0].properties.opacity, 0.3);
});
