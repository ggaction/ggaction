import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { referenceProfiles, rows, targets } from "./reference-values.js";
import { displayedActionCalls, assertDisplayedProgram } from "../../support/visual-variants.js";

test("anchors the Gaussian profile oracle in literal point values", () => {
  const profiles = referenceProfiles("grouped");
  assert.ok(Math.abs(profiles[0].points[10].density - 0.32045650246028803) < 1e-15);
  assert.ok(Math.abs(profiles[1].points[40].density - 0.24197072451914337) < 1e-15);
});
for (const variant of visualVariants) {
  test(`authors ${variant.variant} density with independent sample values and orientation`, () => {
    const before = structuredClone(rows);
    const p = variant.primitive();
    const layer = p.semanticSpec.layers.find(l => l.id === "density");
    const dataset = p.semanticSpec.datasets.find(d => d.id === layer.data);
    const expected = referenceProfiles(variant.variant);
    assert.equal(dataset.values.length, expected.length * 61);
    assert.equal(p.graphicSpec.objects.density.items.length, expected.length);
    for (const [groupIndex, profile] of expected.entries()) {
      for (const [pointIndex, point] of profile.points.entries()) {
        const actual = dataset.values[groupIndex * 61 + pointIndex];
        assert.equal(actual.group, profile.group);
        assert.ok(Math.abs(actual.value_value - point.value) < 1e-12);
        assert.ok(Math.abs(actual.value_density - point.density) < 1e-12);
        assert.ok(actual.value_density >= 0);
      }
    }
    const horizontal = variant.variant === "horizontal";
    assert.equal(layer.encoding.x.field, horizontal ? "value_density" : "value_value");
    assert.equal(layer.encoding.y.field, horizontal ? "value_value" : "value_density");
    assert.equal(p.semanticSpec.guides.axis[horizontal ? "x" : "y"].title, "Density");
    assert.equal(p.markConfigs.density.opacity, 0.2);
    assert.deepEqual(rows, before);
    // Current automatic Cartesian guides select the y grid in both density orientations.
    assert.deepEqual(Object.keys(p.semanticSpec.guides.grid), ["horizontal"]);
    assert.equal(layer.encoding.color?.field, variant.variant === "vertical" ? undefined : "group");
    assert.equal(dataset.source, "source");
    assert.ok(p.graphicSpec.objects.density.items.every(item => item.properties.commands.at(-1).op === "Z"));
  });
  test(`records the exact displayed ${variant.variant} density facade call`, () => {
    const calls = displayedActionCalls(variant.callChain);
    assert.deepEqual(calls.map(c => c.op), ["createCanvas", "createData", "createDensityPlot"]);
    assert.deepEqual(calls.at(-1).args, targets[variant.variant]);
    assertDisplayedProgram(variant, variant.userFacing());
  });
}
