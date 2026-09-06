import assert from "node:assert/strict";
import test from "node:test";

import { createFacetGridPrimitive } from "./primitive.program.js";

test("authors the grid with explicit filtered cells and nested concat layout", () => {
  const program = createFacetGridPrimitive();
  assert.deepEqual(program.graphicSpec.objects.canvas.properties, {
    width: 504, height: 272, background: "white"
  });
  assert.doesNotMatch(JSON.stringify(program.trace), /facetGrid/);
  assert.equal(program.compositionSpec.children.length, 2);
  assert.equal(program.children["view-2"].children["view-2"].semanticSpec.layers.length, 0);
});
