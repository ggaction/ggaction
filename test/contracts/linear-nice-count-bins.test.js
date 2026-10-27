import { assertEquivalentMeaning } from "../support/identity-equivalence.js";
import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { countHistogramBins, resolveHistogramBins } from "../../src/grammar/histogram.js";
import { inferHistogramBoundaries } from "../../src/actions/guides/tickValues.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";

const values = [0, 20, 54, 90, 108].map(value => ({ value, group: "A" }));
const boundaries = [0, 54, 108];

test("count rounding preserves exact histogram boundaries and membership", () => {
  for (const bin of [{ boundaries }, { step: 54 }, { maxBins: 2 }]) {
    const input = { values: values.map(row => row.value), bin };
    const old = resolveHistogramBins({ ...input, nice: true });
    const result = resolveHistogramBins({ ...input, nice: { count: 10 } });
    assert.deepEqual(result.boundaries, old.boundaries);
    assert.equal(result.step, old.step);
    assert.deepEqual(countHistogramBins(input.values, result.boundaries),
      countHistogramBins(input.values, old.boundaries));
    assert(result.domain[0] <= old.domain[0]);
    assert(result.domain[1] >= old.domain[1]);
    assert(Object.isFrozen(result.boundaries));
  }
  assert.deepEqual(resolveHistogramBins({ values: [0, 108], bin: { boundaries },
    nice: { count: 10 } }).domain, [0, 110]);
  assert.deepEqual(resolveHistogramBins({ values: [0, 108], bin: { boundaries },
    nice: { count: 10 }, domain: [0, 108] }).domain, [0, 108]);
  assert.throws(() => resolveHistogramBins({ values: [0, 108], bin: { boundaries },
    nice: { count: 10 }, domain: [0, 120] }), /must match/);
});

function histogram(nice = { count: 10 }, rows = values) {
  return chart().createCanvas().createData({ values: rows })
    .createHistogram({ field: "value", binBoundaries: boundaries, xScale: { nice } });
}

test("histogram facade, axis inference, edits and persistence share the rounded domain", () => {
  const before = histogram(true), program = histogram();
  assert.deepEqual(before.resolvedScales.x.domain, [0, 108]);
  assert.deepEqual(program.resolvedScales.x.domain, [0, 110]);
  assert.deepEqual(inferHistogramBoundaries(program, "x", "x"), boundaries);
  assert.deepEqual(program.semanticSpec.datasets[0].values, values);
  assertEquivalentMeaning(before.editXScale({ nice: { count: 10 } }).graphicSpec, program.graphicSpec);
  assertEquivalentMeaning(program.editXScale({ nice: true }).graphicSpec, before.graphicSpec);
  assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec, program.graphicSpec);
  assert.deepEqual(program.editXScale({ domain: [0, 108] }).resolvedScales.x.domain, [0, 108]);
  assert.throws(() => program.editXScale({ domain: [0, 120] }), /must match/);
});

test("binned aggregate line and shared bar reuse the same unchanged boundaries", () => {
  const program = histogram().createLinePlot({ id: "counts",
    x: { field: "value", bin: { boundaries }, scale: { id: "x" } },
    y: { field: "value", aggregate: "count", scale: { id: "countsY" } }, guides: false });
  assert.deepEqual(program.resolvedScales.x.domain, [0, 110]);
  assert.deepEqual(inferHistogramBoundaries(program, "x", "x"), boundaries);
  assert.equal(program.graphicSpec.objects.counts.items.length, 1);
  assert.deepEqual(program.editXScale({ nice: true }).resolvedScales.x.domain, [0, 108]);
});

test("shared and independent binned facets retain the same stored policy", () => {
  const rows = [...values, ...values.map(row => ({ ...row, group: "B" }))];
  const program = histogram({ count: 10 }, rows).facet({ field: "group" });
  for (const facets of [program, program.editFacetScales({ x: "independent" })]) {
    for (const id of facets.compositionSpec.children) {
      assert.deepEqual(facets.children[id].resolvedScales.x.domain, [0, 110]);
      assert.deepEqual(inferHistogramBoundaries(facets.children[id], "x", "x"), boundaries);
    }
  }
});

test("count objects do not extend the data-bin transform policy", () => {
  const program = chart().createData({ values });
  assert.throws(() => program.createBinData({ id: "bins", field: "value", nice: { count: 10 } }), /boolean/);
  for (const nice of [{ count: 0 }, { count: 10, extra: true }]) {
    assert.throws(() => resolveHistogramBins({ values: [0, 108], nice }));
  }
});
