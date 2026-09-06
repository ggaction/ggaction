import test from "node:test";
import assert from "node:assert/strict";
import { visualVariants } from "./manifest.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
for (const variant of visualVariants) {
  test(`matches ${variant.variant} color primitives and independent value positions`, () => {
    const p = variant.userFacing();
    assertDisplayedProgram(variant, p);
    assertChartProgramsEquivalent({ publicProgram: p, primitiveProgram: variant.primitive() });
    assert.deepEqual(p.graphicSpec.objects.m.items.map(x => x.properties.fill),
      variant.variant === "asymmetric" ? ["#0000ff", "#ffffff", "#ff8080", "#ff0000"] : ["#0000ff", "#6666ff", "#ffcccc", "#ff0000"]);
    if (variant.variant === "asymmetric") {
      const labels = p.graphicSpec.objects.colorGradientLabels.items;
      const index = labels.findIndex(x => x.properties.text === "0");
      assert.ok(index >= 0);
      assert.equal(labels[index].properties.y, 292);
    } else {
      assert.equal(Object.hasOwn(p.semanticSpec.scales.find(x => x.id === "colors"), "midpoint"), false);
    }
  });
}
