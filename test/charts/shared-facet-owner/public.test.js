import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { resolveFacetProgramLayout } from "../../../src/materialization/facets.js";
import { resolveConcreteGraphicBounds } from "../../../src/grammar/schemas/graphicBounds.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
for (const variant of visualVariants) {
  test("the parent union owns one horizontal legend wider than every unchanged child", async () => {
    const p = variant.userFacing(), primitive = variant.primitive();
    assertDisplayedProgram(variant, p);
    assertChartProgramsEquivalent({ publicProgram: p, primitiveProgram: primitive, compareSemanticSpec: false });
    assert.equal(renderToSVG(p, { resourceNamespace: "comparison" }), renderToSVG(primitive, { resourceNamespace: "comparison" }));
    assert.deepEqual((await renderToPDFBuffer(p)).buffer, (await renderToPDFBuffer(primitive)).buffer);
    const { plot, layout } = resolveFacetProgramLayout(p);
    assert.deepEqual(plot, { x: 35, y: 55, width: 375, height: 120 });
    assert.deepEqual(layout.children.map(child => child.x), [0, 105, 210, 315]);
    for (const child of Object.values(p.children)) {
      assert.equal(child.materializationConfigs.canvas.plot.width, 60);
      assert.equal(child.guideConfigs.legend, undefined);
    }
    const bounds = resolveConcreteGraphicBounds(p.graphicSpec, "facet-shared-legend", p.materializationConfigs.textMetrics);
    assert.deepEqual(bounds, { left: 87.5, right: 357.5, top: 183, bottom: 220 });
    assert.equal(bounds.right - bounds.left, 270);
    assert.equal((bounds.left + bounds.right) / 2, plot.x + plot.width / 2);
    assert.deepEqual(p.graphicSpec.objects.colorLegendSymbolPoints.items.map(item => item.properties.y), [201.5, 201.5, 201.5]);
  });
}
