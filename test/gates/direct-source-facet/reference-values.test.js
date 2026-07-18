import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";

import { createDirectFacetGateValues } from "./reference-values.js";

test("resolves direct facet values by source first appearance", () => {
  const values = createDirectFacetGateValues(loadCars());
  assert.deepEqual(values.origins, ["USA", "Europe", "Japan"]);
  assert.deepEqual(values.cylinders, [8, 4, 6, 3, 5]);
  assert.deepEqual(values.colorRange, [
    "#fdc9b4", "#fc9374", "#f6573f", "#d22321", "#970b13"
  ]);
  assert.deepEqual(values.scatter.cells.map(cell => cell.rows.length), [245, 68, 79]);
  assert.deepEqual(values.histogram.cells.map(cell => cell.rows.length), [254, 73, 79]);
});

test("keeps one shared scatter domain across every facet cell", () => {
  const values = createDirectFacetGateValues(loadCars());
  assert.deepEqual(values.scatter.domains, {
    x: [40, 250],
    y: [0, 50]
  });
  assert.equal(values.scatter.columns, 3);
  assert.equal(values.scatter.rows, 1);
  assert.equal(values.scatter.width, 932);
  assert.deepEqual(
    values.scatter.cells.map(({ column, row, x, y }) => ({ column, row, x, y })),
    [
      { column: 0, row: 0, x: 0, y: 52 },
      { column: 1, row: 0, x: 266, y: 52 },
      { column: 2, row: 0, x: 532, y: 52 }
    ]
  );
});

test("uses shared histogram bins and count domain with row-major wrapping", () => {
  const values = createDirectFacetGateValues(loadCars());
  assert.deepEqual(values.histogram.boundaries, [
    50, 106.25, 162.5, 218.75, 275, 331.25, 387.5, 443.75, 500
  ]);
  assert.deepEqual(values.histogram.cells.map(cell => cell.counts), [
    [23, 50, 18, 60, 43, 37, 19, 4],
    [38, 31, 4, 0, 0, 0, 0, 0],
    [47, 30, 2, 0, 0, 0, 0, 0]
  ]);
  assert.deepEqual(values.histogram.domains.y, [0, 60]);
  assert.deepEqual(values.histogram.cells[0].stacks[3], [5, 0, 55, 0, 0]);
  assert.deepEqual(values.histogram.cells[1].stacks[1], [0, 28, 1, 0, 2]);
  assert.deepEqual(values.histogram.cells[2].stacks[0], [0, 43, 0, 4, 0]);
  assert.equal(values.histogram.width, 756);
  assert.deepEqual(
    values.histogram.cells.map(({ column, row, x, y }) => ({ column, row, x, y })),
    [
      { column: 0, row: 0, x: 14, y: 66 },
      { column: 1, row: 0, x: 312, y: 66 },
      { column: 0, row: 1, x: 14, y: 324 }
    ]
  );
});
