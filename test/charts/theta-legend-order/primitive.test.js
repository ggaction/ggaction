import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) {
  test(`keeps ${variant.variant} primitive ordering independent of public order actions`, () => {
    const p = variant.primitive();
    assert.deepEqual(p.resolvedScales.theta.domain, ["C", "A", "B"]);
    assert.deepEqual(p.resolvedScales.color.domain, ["A", "B", "C"]);
    assert.deepEqual(p.semanticSpec.layers[0].encoding.theta.categoryOrder, { values: ["C", "A"] });
    const ops = p.trace.children.map(node => node.op);
    for (const op of ["orderCategories", "editLegend", "createPiePlot"]) assert.equal(ops.includes(op), false);
    assert.ok(ops.includes("editSemantic"));
  });
}
