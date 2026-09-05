import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) {
  test(`authors ${variant.variant} through explicit measured primitives`, () => {
    const p = variant.primitive();
    const ops = p.trace.children.map(node => node.op);
    for (const operation of ["createRosePlot", "createRadialBarPlot", "encodeR", "orderCategories", "editLegend"]) {
      assert.equal(ops.includes(operation), false);
    }
    assert.deepEqual(p.resolvedScales.radius.domain, [0, 4]);
    assert.equal(p.graphicSpec.objects.sectors.items.length, 3);
  });
}
