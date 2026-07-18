import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";

import { createDirectFacetGateValues } from "./reference-values.js";

test("resolves direct facet values by source first appearance", () => {
  const values = createDirectFacetGateValues(loadCars());
  assert.deepEqual(values.origins, ["USA", "Europe", "Japan"]);
  assert.deepEqual(values.scatter.cells.map(cell => cell.rows.length), [245, 68, 79]);
  assert.deepEqual(values.histogram.cells.map(cell => cell.rows.length), [254, 73, 79]);
});

test("keeps one shared scatter domain across every facet cell", () => {
  const values = createDirectFacetGateValues(loadCars());
  assert.deepEqual(values.scatter.domains, {
    x: [46, 230],
    y: [9, 46.6]
  });
  assert.equal(values.scatter.columns, 3);
  assert.equal(values.scatter.rows, 1);
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
  assert.deepEqual(
    values.histogram.cells.map(({ column, row, x, y }) => ({ column, row, x, y })),
    [
      { column: 0, row: 0, x: 14, y: 66 },
      { column: 1, row: 0, x: 312, y: 66 },
      { column: 0, row: 1, x: 14, y: 324 }
    ]
  );
});

