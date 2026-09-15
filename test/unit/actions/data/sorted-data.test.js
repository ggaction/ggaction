import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import {
  deserializeProgram,
  serializeProgram
} from "../../../../src/persistence.js";

const rows = [
  { id: "a2-first", group: "A", x: 2 },
  { id: "b1", group: "B", x: 1 },
  { id: "a-null", group: "A", x: null },
  { id: "a1", group: "A", x: 1 },
  { id: "a2-second", group: "A", x: 2 }
];

function ids(program) {
  return program.semanticSpec.datasets.at(-1).values.map(row => row.id);
}

test("createSortedData performs a stable multi-key sort without mutating input", () => {
  const input = structuredClone(rows);
  const source = chart().createData({ id: "source", values: input });
  const sorted = source.createSortedData({
    id: "sorted",
    sortBy: [
      { field: "group" },
      { field: "x", order: "descending", nulls: "last" }
    ]
  });

  assert.deepEqual(ids(sorted), ["a2-first", "a2-second", "a1", "a-null", "b1"]);
  assert.deepEqual(input, rows);
  assert.deepEqual(
    sorted.semanticSpec.datasets.at(-1).schema.fields,
    source.semanticSpec.datasets[0].schema.fields
  );
});

test("sorted data supports focused edits and rejects mixed key types atomically", () => {
  const sorted = chart()
    .createData({ id: "source", values: rows })
    .createSortedData({ id: "sorted", sortBy: [{ field: "x" }] });
  const edited = sorted.editSortedData({
    target: "sorted",
    sortBy: [{ field: "x", order: "descending", nulls: "first" }]
  });

  assert.deepEqual(ids(edited), ["a-null", "a2-first", "a2-second", "b1", "a1"]);
  assert.throws(
    () => chart()
      .createData({ id: "source", values: [{ key: 1 }, { key: "1" }] })
      .createSortedData({ id: "sorted", sortBy: [{ field: "key" }] }),
    /mixed non-missing types/
  );
  assert.equal(sorted.semanticSpec.datasets.at(-1).id, "sorted");
});

test("temporal sorting accepts explicit timestamp normalization", () => {
  const sorted = chart()
    .createData({ id: "source", values: [
      { id: "later", when: Date.UTC(2025, 0, 2) },
      { id: "earlier", when: Date.UTC(2025, 0, 1) }
    ] })
    .createSortedData({
      id: "sorted",
      sortBy: [{ field: "when", temporalUnit: "timestamp" }]
    });

  assert.deepEqual(ids(sorted), ["earlier", "later"]);
});

test("sorted data follows source revisions and editable snapshots", () => {
  const original = chart()
    .createData({
      id: "source",
      values: [{ id: "b", x: 2 }, { id: "a", x: 1 }],
      schema: { fields: [
        { name: "id", storageType: "string", nullable: false },
        { name: "x", storageType: "number", nullable: false }
      ] }
    })
    .createSortedData({ id: "sorted", sortBy: [{ field: "x" }] });
  const restored = deserializeProgram(serializeProgram(original));
  const revised = restored.reviseData({
    source: "source",
    id: "source2",
    values: [{ id: "c", x: 3 }, { id: "a", x: 1 }]
  });
  const logical = revised.materializationConfigs.data.sort.sorted.current;
  assert.deepEqual(
    revised.semanticSpec.datasets.find(dataset => dataset.id === logical).values.map(row => row.id),
    ["a", "c"]
  );
  assert.equal(original.semanticSpec.datasets.at(-1).id, "sorted");
});
