import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import { createCarsOriginScatterplotFacetPrimitives } from
  "./primitive.program.js";

test("authors the approved direct-source facet concrete tree", () => {
  const program = createCarsOriginScatterplotFacetPrimitives(loadCars());
  assert.deepEqual(program.graphicSpec.objects.canvas.properties, {
    width: 932,
    height: 282,
    background: "white"
  });
  assert.equal(program.graphicSpec.objects.canvas.children.length, 7);
});
