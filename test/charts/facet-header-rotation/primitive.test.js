import test from "node:test";
import assert from "node:assert/strict";
import { resolveTextBounds } from "../../../src/core/textMetrics.js";
import { createFacetHeaderRotationPrimitives } from "./primitive.program.js";

test("primitive header literals occupy the two fixed outer-margin targets", () => {
  const p = createFacetHeaderRotationPrimitives();
  assert.deepEqual(p.graphicSpec.objects.canvas.properties, { width: 185, height: 195, background: "white" });
  const items = p.graphicSpec.objects["facet-headers"].items;
  assert.deepEqual(items.map(x => x.properties.text), ["North", "South"]);
  for (let i = 0; i < items.length; i++) {
    const x = items[i].properties, b = resolveTextBounds(x);
    assert.equal(x.x, 9); assert.equal(x.y, 50 + 85 * i);
    assert.equal(x.rotation, -Math.PI / 2);
    assert(Math.abs(b.left - 3) < 1e-12);
    assert.equal(b.right, 15.000000000000002);
    assert(Math.abs((b.top + b.bottom) / 2 - x.y) < 1e-12);
    assert(Object.isFrozen(x));
  }
});
