import test from "node:test";
import assert from "node:assert/strict";
import { visualVariants } from "./manifest.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
for (const variant of visualVariants) {
  test(`matches ${variant.variant} color transition with explicit primitives and literal classes`, () => {
    const p = variant.userFacing(); assertDisplayedProgram(variant, p);
    assertChartProgramsEquivalent({ publicProgram: p, primitiveProgram: variant.primitive() });
    assert.deepEqual(p.resolvedScales.colors.thresholds, [3]);
    assert.deepEqual(p.graphicSpec.objects.m.items.map(x => x.properties.fill),
      variant.variant === "point" ? ["blue", "blue", "red", "red"] : ["blue", "red", "red"]);
    assert.equal(p.graphicSpec.objects.colorGradientStrips, undefined);
    assert.equal(p.guideConfigs.legend.interval.scale, "colors");
    assert.equal(p.semanticSpec.scales.find(x => x.id === "colors").midpoint, undefined);
    assertChartProgramsEquivalent({ publicProgram: p.editCanvas({ width: 1100 }), primitiveProgram: variant.primitive().editCanvas({ width: 1100 }) });
  });
}
