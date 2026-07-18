import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder } from "../../support/data.js";
import { createGapminderRegressionFacetValues } from "./reference-values.js";

test("locks per-cluster row counts and independently fitted regression models", () => {
  const values = createGapminderRegressionFacetValues(loadGapminder());
  assert.deepEqual(values.clusters, [0, 3, 4, 1, 5, 2]);
  assert.deepEqual(values.cells.map(cell => cell.rows.length), [44, 220, 99, 209, 66, 44]);
  assert.deepEqual(values.cells.map(cell => ({
    cluster: cell.cluster,
    count: cell.model.count,
    slope: Number(cell.model.slope.toFixed(9)),
    intercept: Number(cell.model.intercept.toFixed(9))
  })), [
    { cluster: 0, count: 44, slope: -3.508116058, intercept: 74.498691206 },
    { cluster: 3, count: 220, slope: -4.260484772, intercept: 83.93517049 },
    { cluster: 4, count: 99, slope: -4.139534751, intercept: 81.071105991 },
    { cluster: 1, count: 209, slope: -4.68548496, intercept: 83.396678623 },
    { cluster: 5, count: 66, slope: -4.067799494, intercept: 85.453386518 },
    { cluster: 2, count: 44, slope: -1.918464693, intercept: 65.704542629 }
  ]);
});

test("locks shared and independent domains independently from screenshots", () => {
  const rows = loadGapminder();
  const shared = createGapminderRegressionFacetValues(rows);
  const independent = createGapminderRegressionFacetValues(rows, {
    xResolution: "independent"
  });
  assert.deepEqual(shared.shared, {
    x: [0, 10],
    y: [20, 100],
    color: [82656, 1304887562]
  });
  assert.equal(new Set(shared.cells.map(cell => JSON.stringify(cell.domains.x))).size, 1);
  assert.equal(new Set(independent.cells.map(cell => JSON.stringify(cell.domains.x))).size > 1, true);
  assert.deepEqual(
    independent.cells.map(cell => cell.domains.y),
    shared.cells.map(cell => cell.domains.y)
  );
  assert.deepEqual([shared.width, shared.height], [908, 588]);
});
