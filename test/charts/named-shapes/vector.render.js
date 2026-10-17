import assert from "node:assert/strict";
import test from "node:test";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) {
  test("named-shape SVG and PDF match the independent primitive exactly", async () => {
    const actual=variant.userFacing(),expected=variant.primitive();
    const svg=renderToSVG(actual,{resourceNamespace:"comparison"});
    assert.equal(svg,renderToSVG(expected,{resourceNamespace:"comparison"}));
    assert.equal((svg.match(/<path\b/g)??[]).length,4);
    assert.ok(!svg.includes("<image"));
    assert.deepEqual((await renderToPDFBuffer(actual)).buffer,(await renderToPDFBuffer(expected)).buffer);
  });
}
