import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveWindowRows,
  normalizeWindowTransform,
  validateWindowTransform
} from "../../../../src/grammar/window.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", score: 20, value: 4 }),
  Object.freeze({ group: "A", score: 10, value: 3 }),
  Object.freeze({ group: "B", score: 10, value: 5 }),
  Object.freeze({ group: "A", score: 20, value: 2 }),
  Object.freeze({ group: "B", score: 10, value: 1 }),
  Object.freeze({ group: "A", score: 30, value: 1 })
]);

function completeTransform() {
  return normalizeWindowTransform({
    partitionBy: "group",
    sortBy: [{ field: "score" }],
    operations: [
      { op: "rowNumber", as: "rowNumber" },
      { op: "rank", as: "rank" },
      { op: "denseRank", as: "denseRank" },
      { op: "cumulativeSum", field: "value", as: "running" },
      { op: "lag", field: "running", as: "previousRunning" },
      { op: "lead", field: "value", as: "nextValue", default: -1 }
    ]
  });
}

test("normalizes complete immutable window provenance", () => {
  const transform = completeTransform();

  assert.deepEqual(transform.partitionBy, ["group"]);
  assert.deepEqual(transform.sortBy, [{ field: "score", order: "ascending" }]);
  assert.deepEqual(transform.operations.at(-2), {
    op: "lag",
    field: "running",
    as: "previousRunning",
    offset: 1,
    default: null
  });
  assert.equal(Object.isFrozen(transform), true);
  assert.equal(Object.isFrozen(transform.operations), true);
});

test("derives stable ranks and sequential operation fields in source order", () => {
  const output = deriveWindowRows(rows, completeTransform());

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
  assert.equal(Object.isFrozen(output), true);
  assert.equal(Object.isFrozen(output[0]), true);
});

test("orders nulls last ascending and first descending without unstable ties", () => {
  const input = [
    { id: "a", group: "A", order: null },
    { id: "b", group: "A", order: 2 },
    { id: "c", group: "A", order: 2 },
    { id: "d", group: "A", order: 1 }
  ];
  const ascending = deriveWindowRows(input, normalizeWindowTransform({
    partitionBy: "group",
    sortBy: [{ field: "order" }],
    operations: [{ op: "rowNumber", as: "position" }]
  }));
  const descending = deriveWindowRows(input, normalizeWindowTransform({
    partitionBy: "group",
    sortBy: [{ field: "order", order: "descending" }],
    operations: [{ op: "rowNumber", as: "position" }]
  }));

  assert.deepEqual(ascending.map(row => row.position), [4, 2, 3, 1]);
  assert.deepEqual(descending.map(row => row.position), [1, 2, 3, 4]);
});

test("derives truncated trailing and centered moving frames per partition", () => {
  const input = [
    { group: "A", order: 3, value: 9 },
    { group: "A", order: 1, value: 1 },
    { group: "B", order: 2, value: -2 },
    { group: "A", order: 2, value: 5 },
    { group: "B", order: 1, value: 2 }
  ];
  const output = deriveWindowRows(input, normalizeWindowTransform({
    partitionBy: "group",
    sortBy: [{ field: "order" }],
    operations: [
      {
        op: "movingMean",
        field: "value",
        as: "trailingMean",
        frame: { preceding: 2 }
      },
      {
        op: "movingSum",
        field: "value",
        as: "centeredSum",
        frame: { preceding: 1, following: 1 }
      }
    ]
  }));

  assert.deepEqual(output.map(row => ({
    trailingMean: row.trailingMean,
    centeredSum: row.centeredSum
  })), [
    { trailingMean: 5, centeredSum: 14 },
    { trailingMean: 1, centeredSum: 6 },
    { trailingMean: 0, centeredSum: 0 },
    { trailingMean: 3, centeredSum: 15 },
    { trailingMean: 2, centeredSum: 0 }
  ]);
});

test("supports zero frames, stable ties, descending sort, and sequential moving fields", () => {
  const input = [
    { id: "a", order: 2, value: 1.5 },
    { id: "b", order: 2, value: 2.5 },
    { id: "c", order: 1, value: -1 }
  ];
  const transform = normalizeWindowTransform({
    sortBy: [{ field: "order", order: "descending" }],
    operations: [
      {
        op: "movingSum",
        field: "value",
        as: "identity",
        frame: { preceding: 0 }
      },
      {
        op: "movingMean",
        field: "identity",
        as: "pairMean",
        frame: { preceding: 1 }
      }
    ]
  });
  const output = deriveWindowRows(input, transform);

  assert.deepEqual(transform.operations.map(operation => operation.frame), [
    { preceding: 0, following: 0 },
    { preceding: 1, following: 0 }
  ]);
  assert.deepEqual(output.map(row => [row.identity, row.pairMean]), [
    [1.5, 1.5],
    [2.5, 2],
    [-1, 0.75]
  ]);
});

test("rejects malformed moving frames and non-finite inputs or outputs", () => {
  for (const [frame, pattern] of [
    [undefined, /frame must be a plain object/],
    [{ following: 1 }, /preceding must be a non-negative integer/],
    [{ preceding: -1 }, /preceding must be a non-negative integer/],
    [{ preceding: 1.5 }, /preceding must be a non-negative integer/],
    [{ preceding: 1, following: -1 }, /following must be a non-negative integer/],
    [{ preceding: 1, unknown: true }, /Unknown window movingMean frame property/]
  ]) {
    assert.throws(
      () => normalizeWindowTransform({
        operations: [{
          op: "movingMean",
          field: "value",
          as: "moving",
          frame
        }]
      }),
      pattern
    );
  }
  assert.throws(
    () => deriveWindowRows([{ value: 1 }, { value: Number.NaN }],
      normalizeWindowTransform({
        operations: [{
          op: "movingSum",
          field: "value",
          as: "moving",
          frame: { preceding: 1 }
        }]
      })),
    /movingSum field "value" must contain finite numbers/
  );
  assert.throws(
    () => deriveWindowRows([{ value: Number.MAX_VALUE }, { value: Number.MAX_VALUE }],
      normalizeWindowTransform({
        operations: [{
          op: "movingSum",
          field: "value",
          as: "moving",
          frame: { preceding: 1 }
        }]
      })),
    /movingSum output "moving" must be finite/
  );
});

test("validates ranking, offsets, field dependencies, collisions, and comparable values", () => {
  assert.throws(
    () => normalizeWindowTransform({
      operations: [{ op: "rank", as: "rank" }]
    }),
    /rank requires a non-empty window sortBy/
  );
  assert.throws(
    () => normalizeWindowTransform({
      operations: [{ op: "lag", field: "value", as: "lagged", offset: 0 }]
    }),
    /offset must be a positive integer/
  );
  assert.throws(
    () => deriveWindowRows([{ value: 1 }], normalizeWindowTransform({
      operations: [{ op: "lag", field: "missing", as: "lagged" }]
    })),
    /does not contain field "missing"/
  );
  assert.throws(
    () => deriveWindowRows([{ value: 1 }], normalizeWindowTransform({
      operations: [{ op: "rowNumber", as: "value" }]
    })),
    /output field "value" already exists/
  );
  assert.throws(
    () => deriveWindowRows([
      { group: "A", value: 1 },
      { group: "A", value: "two" }
    ], normalizeWindowTransform({
      partitionBy: "group",
      sortBy: [{ field: "value" }],
      operations: [{ op: "rowNumber", as: "position" }]
    })),
    /one comparable primitive type/
  );
  assert.throws(
    () => validateWindowTransform({
      type: "window",
      partitionBy: [],
      sortBy: [],
      operations: [{ op: "rowNumber", as: "position", extra: true }]
    }),
    /Unknown window operation 0 property "extra"/
  );
});
