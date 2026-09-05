import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { parseAst } from "rollup/parseAst";
import { cases, rows, layout } from "./fixture.js";
import { referenceFor } from "./reference-values.js";
import { visualVariants, inputHashes } from "./manifest.js";
for (const [index, variant] of cases.entries()) {
  test(`${variant.id} realizes the exact temporal domain, UTC labels and two positions`, () => {
    const reference = referenceFor(variant);
    assert.deepEqual(reference.domain, variant.unit === "timestamp" ? [1000, 2000] : [-30610224000000, 946684800000]);
    assert.equal(createHash("sha256").update(JSON.stringify({ layout, variant, rows: rows })).digest("hex"), inputHashes[variant.id]);
    const program = visualVariants[index].primitive();
    assert.deepEqual(program.resolvedScales.x.domain, reference.domain);
    assert.deepEqual(program.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text), reference.labels);
    const points = program.graphicSpec.objects.events.items;
    assert.equal(points.length, 2);
    points.forEach((item, i) => {
      assert.equal(item.properties.x, reference.points[i].x);
      assert.ok(Math.abs(item.properties.y - reference.points[i].y) < 1e-10);
    });
    assert.deepEqual(program.semanticSpec.datasets[0].values.map(({ time, value }) => ({ time, value })), rows);
    assert.equal(visualVariants[index].userFacing, undefined);
    assert.doesNotThrow(() => parseAst(visualVariants[index].callChain));
  });
}
test("timestamp and year meanings differ while automatic numeric-year semantics are retained", () => {
  assert.deepEqual(referenceFor(cases[0]).normalizedRows.map(row => row.isoTime), ["1970-01-01T00:00:01.000Z", "1970-01-01T00:00:02.000Z"]);
  assert.deepEqual(referenceFor(cases[1]).normalizedRows.map(row => row.isoTime), ["1000-01-01T00:00:00.000Z", "2000-01-01T00:00:00.000Z"]);
  assert.deepEqual(referenceFor(cases[1]).timestamps, referenceFor(cases[2]).timestamps);
  assert.notDeepEqual(referenceFor(cases[0]).timestamps, referenceFor(cases[1]).timestamps);
});
