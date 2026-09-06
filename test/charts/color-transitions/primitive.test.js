import test from "node:test";
import assert from "node:assert/strict";
import { createPointPrimitive, createBarPrimitive } from "./primitive.program.js";
test("constructs interval targets through explicit scale leaves and mark materialization", () => {
  for (const build of [createPointPrimitive, createBarPrimitive]) {
    const p = build();
    assert.equal(p.resolvedScales.colors.type, "quantize");
    assert.equal(p.guideConfigs.legend.gradient, undefined);
    assert.deepEqual(p.graphicSpec.objects.colorLegendLabels.items.map(x => x.properties.text), ["< 3", "≥ 3"]);
  }
});
