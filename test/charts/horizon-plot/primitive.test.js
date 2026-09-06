import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { referenceHorizon, rows, targets, revisions } from "./reference-values.js";
import { displayedActionCalls, assertDisplayedProgram } from "../../support/visual-variants.js";

for (const variant of visualVariants) {
  test(`authors ${variant.variant} folded paths against an independent signed-band oracle`, () => {
    const before = structuredClone(rows[variant.variant]);
    const p = variant.primitive();
    const layer = p.semanticSpec.layers.find(l => l.id === "horizon");
    const dataset = p.semanticSpec.datasets.find(d => d.id === layer.data);
    const transform = dataset.transform[0];
    const reference = referenceHorizon(variant.variant);
    assert.equal(reference.groups[0].extent, 4);
    assert.equal(reference.groups[0].bandHeight, 4 / 3);
    assert.equal(reference.series.length, 6);
    assert.equal(p.graphicSpec.objects.horizon.items.length, 6);
    assert.equal(dataset.values.length, 24);
    for (const series of reference.series) {
      const actual = dataset.values.filter(row => row[transform.as.sign] === series.sign && row[transform.as.band] === series.bandIndex);
      assert.equal(actual.length, series.points.length);
      for (const [i, point] of series.points.entries()) {
        assert.equal(actual[i][transform.as.x], point.x);
        assert.equal(actual[i][transform.as.lower], 0);
        assert.ok(Math.abs(actual[i][transform.as.upper] - point.amplitude / series.bandHeight) < 1e-12);
      }
    }
    assert.deepEqual(Object.keys(p.semanticSpec.guides.axis), ["x"]);
    assert.deepEqual(Object.keys(p.semanticSpec.guides.grid), ["vertical"]);
    assert.equal(p.semanticSpec.guides.legend, undefined);
    assert.deepEqual(p.resolvedScales[layer.encoding.y.scale].domain, [0, 1]);
    assert.deepEqual(p.resolvedScales[layer.encoding.x.scale].domain, variant.variant === "temporal" ? [1000, 2000] : [0, 6]);
    assert.equal(p.markConfigs.horizon.opacity, variant.variant === "baseline-style" ? 0.6 : 1);
    assert.equal(transform.baseline, variant.variant === "baseline-style" ? 2 : 0);
    assert.equal(transform.bands, 3);
    assert.equal(dataset.source, "source");
    assert.deepEqual(rows[variant.variant], before);
  });
  test(`records the exact displayed ${variant.variant} Horizon facade and revision chain`, () => {
    const calls = displayedActionCalls(variant.callChain);
    assert.deepEqual(calls.map(c => c.op), ["createCanvas", "createData", "createHorizonPlot", ...(revisions[variant.variant] ?? []).map(e => e.op)]);
    assert.deepEqual(calls[2].args, targets[variant.variant]);
    assert.deepEqual(calls.slice(3), revisions[variant.variant] ?? []);
    assertDisplayedProgram(variant, variant.userFacing());
  });
}
