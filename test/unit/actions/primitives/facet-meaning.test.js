import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { synchronizeFacetColorSizeMeaning } from "../../../../src/actions/primitives/semanticAction.js";

function points() {
  return chart().createCanvas({ width: 800, height: 600, margin: 100 })
    .createData({ values: [{ x: 0, y: 0, group: "A" }, { x: 1, y: 1, group: "B" }] })
    .createScatterPlot({ x: "x", y: "y", guides: false });
}

test("the private facet meaning adapter rejects ordinary chart programs", () => {
  const program = points(), before = JSON.stringify(program);
  assert.throws(() => synchronizeFacetColorSizeMeaning(program), /requires a facet composition/);
  assert.equal(JSON.stringify(program), before);
});

test("the private facet meaning adapter rejects arbitrary keys without changing composition", () => {
  const program = points().facet({ field: "group", columns: 2 });
  const before = JSON.stringify(program);
  for (const meaning of [null, [], "invalid", { arbitrary: "path" }]) {
    assert.throws(() => synchronizeFacetColorSizeMeaning(program, meaning), /native scale bindings and title/);
    assert.equal(JSON.stringify(program), before);
  }
  const cleared = synchronizeFacetColorSizeMeaning(program);
  assert.deepEqual(cleared.semanticSpec, program.semanticSpec);
  assert.deepEqual(cleared.compositionSpec, program.compositionSpec);
  assert.equal(JSON.stringify(program), before);
});
