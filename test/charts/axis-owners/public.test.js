import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { cartesianTitleAnchor } from "../../oracles/cartesian-axis-geometry.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
for (const variant of visualVariants) {
  test("independent axes converge to literal primitives, scale coordinates and renderer calls", async () => {
    const p = variant.userFacing(), primitive = variant.primitive();
    assertDisplayedProgram(variant, p);
    assertChartProgramsEquivalent({ publicProgram: p, primitiveProgram: primitive, compareSemanticSpec: false });
    assert.equal(renderToSVG(p, { resourceNamespace: "comparison" }), renderToSVG(primitive, { resourceNamespace: "comparison" }));
    assert.deepEqual((await renderToPDFBuffer(p)).buffer, (await renderToPDFBuffer(primitive)).buffer);
    assert.equal(p.semanticSpec.guides.axis.quantity.scale, "y");
    assert.equal(p.semanticSpec.guides.axis.share.scale, "share");
    assert.deepEqual(p.resolvedScales.y.domain, [0, 100]);
    assert.deepEqual(p.resolvedScales.share.domain, [0, 1]);
    assert.equal(p.graphicSpec.objects.axis_quantity__Line.properties.x1, 45);
    assert.equal(p.graphicSpec.objects.axis_share__Line.properties.x1, 395);
    assert.deepEqual(p.graphicSpec.objects.axis_quantity__Ticks.items.map(item => item.properties.y1), [195, 125, 55]);
    assert.deepEqual(p.graphicSpec.objects.axis_share__Ticks.items.map(item => item.properties.y1), [195, 125, 55]);
    assert.deepEqual(p.graphicSpec.objects.horizontalGridLines.items.map(item => item.properties.strokeDash), [[2, 2], [], [2, 2]]);
    const anchor = cartesianTitleAnchor({ plot: { left: 65, top: 55, width: 310, height: 140 }, channel: "x", side: "bottom", frameOffset: 0, offset: -20, alongOffset: 145 });
    assert.deepEqual(anchor, { x: 365, y: 175 });
    assert.equal(p.graphicSpec.objects.xAxisTitle.properties.x, anchor.x);
    assert.equal(p.graphicSpec.objects.xAxisTitle.properties.y, anchor.y);
  });
}
