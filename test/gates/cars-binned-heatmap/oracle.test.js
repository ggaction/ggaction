import assert from "node:assert/strict";
import test from "node:test";

import { createBin2DReference } from "../../oracles/bin2d.js";
import { createWindowReference } from "../../oracles/window.js";
import { loadCars } from "../../support/data.js";

test("window reference preserves source order and applies stable sequential operations", () => {
  const rows = [
    { group: "A", score: 20, value: 4 },
    { group: "A", score: 10, value: 3 },
    { group: "B", score: 10, value: 5 },
    { group: "A", score: 20, value: 2 },
    { group: "B", score: 10, value: 1 },
    { group: "A", score: 30, value: 1 }
  ];
  const output = createWindowReference(rows, {
    partitionBy: "group",
    sortBy: [{ field: "score", order: "ascending" }],
    operations: [
      { op: "rowNumber", as: "rowNumber" },
      { op: "rank", as: "rank" },
      { op: "denseRank", as: "denseRank" },
      { op: "cumulativeSum", field: "value", as: "running" },
      { op: "lag", field: "running", as: "previousRunning" },
      { op: "lead", field: "value", as: "nextValue", default: -1 }
    ]
  });

  assert.deepEqual(output.map(row => ({
    rowNumber: row.rowNumber,
    rank: row.rank,
    denseRank: row.denseRank,
    running: row.running,
    previousRunning: row.previousRunning,
    nextValue: row.nextValue
  })), [
    { rowNumber: 2, rank: 2, denseRank: 2, running: 7, previousRunning: 3, nextValue: 2 },
    { rowNumber: 1, rank: 1, denseRank: 1, running: 3, previousRunning: null, nextValue: 4 },
    { rowNumber: 1, rank: 1, denseRank: 1, running: 5, previousRunning: null, nextValue: 1 },
    { rowNumber: 3, rank: 2, denseRank: 2, running: 9, previousRunning: 7, nextValue: 1 },
    { rowNumber: 2, rank: 1, denseRank: 1, running: 6, previousRunning: 5, nextValue: -1 },
    { rowNumber: 4, rank: 4, denseRank: 3, running: 10, previousRunning: 9, nextValue: -1 }
  ]);
  assert.deepEqual(rows[0], { group: "A", score: 20, value: 4 });
});

test("window reference rejects ambiguous ranking and output collisions", () => {
  assert.throws(
    () => createWindowReference([{ value: 1 }], {
      operations: [{ op: "rank", as: "rank" }]
    }),
    /rank requires a non-empty sortBy/
  );
  assert.throws(
    () => createWindowReference([{ value: 1 }], {
      operations: [{ op: "rowNumber", as: "value" }]
    }),
    /output field "value" already exists/
  );
});

test("2D bin reference assigns interior and final boundaries exactly once", () => {
  const result = createBin2DReference([
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
    { x: null, y: 1 },
    { x: 1, y: "invalid" }
  ], {
    id: "cells",
    x: "x",
    y: "y",
    bins: { x: 2, y: 2 },
    extent: { x: [0, 2], y: [0, 2] },
    includeEmpty: true,
    members: true,
    as: {
      x0: "x0", x1: "x1", y0: "y0", y1: "y1",
      count: "count", members: "members"
    }
  });

  assert.equal(result.eligibleCount, 4);
  assert.equal(result.occupiedCount, 3);
  assert.deepEqual(result.rows, [
    { x0: 0, x1: 1, y0: 0, y1: 1, count: 1, members: [0] },
    { x0: 1, x1: 2, y0: 0, y1: 1, count: 2, members: [1, 2] },
    { x0: 0, x1: 1, y0: 1, y1: 2, count: 1, members: [3] },
    { x0: 1, x1: 2, y0: 1, y1: 2, count: 0, members: [] }
  ]);
  assert.equal(result.rows.reduce((sum, row) => sum + row.count, 0), 4);
});

test("Cars Weight–MPG bins conserve all eligible rows with a fixed matrix", () => {
  const result = createBin2DReference(loadCars(), {
    id: "carsWeightMpg",
    x: "Weight_in_lbs",
    y: "Miles_per_Gallon",
    bins: { x: 10, y: 8 },
    extent: { x: [1500, 5200], y: [8, 48] },
    includeEmpty: true,
    as: { count: "count" }
  });
  const counts = result.rows.map(row => row.count);

  assert.equal(result.eligibleCount, 398);
  assert.equal(result.rows.length, 80);
  assert.equal(result.occupiedCount, 38);
  assert.equal(counts.reduce((sum, value) => sum + value, 0), 398);
  assert.equal(Math.max(...counts), 33);
  assert.deepEqual(counts, [
    0, 0, 0, 0, 0, 1, 0, 3, 4, 5,
    0, 0, 0, 0, 8, 15, 26, 33, 11, 1,
    0, 2, 14, 23, 24, 23, 4, 0, 0, 0,
    2, 18, 26, 29, 4, 2, 2, 0, 0, 0,
    6, 32, 14, 9, 3, 0, 0, 0, 0, 0,
    7, 22, 7, 1, 0, 0, 0, 0, 0, 0,
    2, 8, 0, 0, 1, 0, 0, 0, 0, 0,
    1, 4, 1, 0, 0, 0, 0, 0, 0, 0
  ]);
});

test("2D bin reference rejects explicit extents that silently drop data", () => {
  assert.throws(
    () => createBin2DReference([{ x: 0, y: 0 }, { x: 3, y: 1 }], {
      id: "cells",
      x: "x",
      y: "y",
      extent: { x: [0, 2] }
    }),
    /x extent must contain every eligible value/
  );
});
