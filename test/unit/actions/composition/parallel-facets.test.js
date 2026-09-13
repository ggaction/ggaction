import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ panel: "A", column: "one", a: 0, b: 0 }),
  Object.freeze({ panel: "A", column: "two", a: 1, b: 1000 }),
  Object.freeze({ panel: "B", column: "one", a: 1, b: 1000 }),
  Object.freeze({ panel: "B", column: "two", a: 2, b: 2000 })
]);

function source() {
  return chart()
    .createCanvas({ width: 280, height: 220, margin: 40 })
    .createData({ id: "values", values: rows })
    .createParallelCoordinates({
      id: "paths",
      dimensions: [
        { field: "a", scale: { zero: false, nice: false } },
        { field: "b", scale: { zero: false, nice: false } }
      ],
      guides: false
    });
}

test("facets Parallel coordinates without mixing dimension domains", () => {
  const base = source();
  const shared = base.facet({ field: "panel" });
  const independent = base.facet({
    field: "panel", scales: { parallelDimensions: "independent" }
  });
  const ids = base.semanticSpec.layers[0].encoding.parallel.dimensions
    .map(dimension => dimension.scale);

  assert.deepEqual(Object.values(shared.children).map(child => [
    child.resolvedScales[ids[0]].domain,
    child.resolvedScales[ids[1]].domain
  ]), [[[0, 2], [0, 2000]], [[0, 2], [0, 2000]]]);
  assert.deepEqual(Object.values(independent.children).map(child => [
    child.resolvedScales[ids[0]].domain,
    child.resolvedScales[ids[1]].domain
  ]), [[[0, 1], [0, 1000]], [[1, 2], [1000, 2000]]]);
  assert.deepEqual(Object.values(shared.children).map(child =>
    child.graphicSpec.objects.paths.items.length), [2, 2]);
});

test("facets Parallel coordinates on a grid and rejects outer axes", () => {
  const base = source();
  const grid = base.facetGrid({
    rows: { field: "panel" }, columns: { field: "column" },
    combinations: "observed"
  });
  assert.equal(grid.compositionSpec.children.length, 4);
  assert.deepEqual(Object.values(grid.children).map(child =>
    child.graphicSpec.objects.paths.items.length), [1, 1, 1, 1]);
  assert.throws(
    () => grid.editFacetGuides({ axes: "outer" }),
    /do not support outer axes/
  );
});

test("keeps local Parallel axes in an empty full-grid panel", () => {
  const values = [
    { panel: "A", column: "one", a: 0, b: 0 },
    { panel: "A", column: "two", a: 1, b: 1000 },
    { panel: "B", column: "one", a: 2, b: 2000 }
  ];
  const unit = chart()
    .createCanvas({ width: 320, height: 240, margin: 50 })
    .createData({ id: "values", values })
    .createParallelCoordinates({
      id: "paths",
      dimensions: [
        { field: "a", scale: { zero: false, nice: false } },
        { field: "b", scale: { zero: false, nice: false } }
      ]
    });
  const before = unit.graphicSpec;
  const grid = unit.facetGrid({
    id: "matrix",
    rows: { field: "panel" },
    columns: { field: "column" },
    combinations: "full"
  });
  const empty = grid.children["matrix-row-2-column-2"];

  assert.deepEqual(empty.graphicSpec.objects.paths.items, []);
  for (const id of [
    "parallelAxisLines",
    "parallelAxisTicks",
    "parallelAxisLabels",
    "parallelAxisTitles"
  ]) {
    assert.equal(typeof empty.graphicSpec.objects[id].type, "string", id);
    assert.equal(empty.graphicSpec.objects[id].items.length > 0, true, id);
  }
  assert.equal(grid.compositionSpec.facet.grid.cells.at(-1).empty, true);
  assert.equal(unit.graphicSpec, before);
});
