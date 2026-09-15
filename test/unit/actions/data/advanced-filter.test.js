import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

const rows = [
  { id: 1, x: 1 }, { id: 2, x: 2 }, { id: 3, x: 3 },
  { id: 4, x: 1 }, { id: 5, x: 2 }, { id: 6, x: 3 }
];

function rowIds(program) {
  return program.semanticSpec.datasets.at(-1).values.map(row => row.id);
}

test("range filters support independent inclusive endpoints", () => {
  const result = chart()
    .createData({ id: "source", values: rows })
    .filterData({
      id: "filtered",
      field: "x",
      range: { min: 1, max: 3, minInclusive: true, maxInclusive: false }
    });
  assert.deepEqual(rowIds(result), [1, 2, 4, 5]);
});

test("noneOf comparisons preserve scalar types and explicit null handling", () => {
  const source = chart().createData({ id: "source", values: [
    { id: "number", value: 1 },
    { id: "string", value: "1" },
    { id: "two", value: 2 },
    { id: "null", value: null }
  ] });
  const legacy = source.filterData({ id: "legacy", field: "value", noneOf: [1] });
  const excluded = source.filterData({
    id: "excluded",
    source: "source",
    field: "value",
    noneOf: [1],
    nulls: "exclude"
  });

  assert.deepEqual(rowIds(legacy), ["string", "two", "null"]);
  assert.deepEqual(rowIds(excluded), ["string", "two"]);
});

test("partial range edits retain the opposite endpoint and inclusivity", () => {
  const before = chart()
    .createData({ id: "source", values: rows })
    .filterData({
      id: "filtered",
      field: "x",
      range: { min: 1, max: 3, minInclusive: true, maxInclusive: false }
    });
  const after = before.editFilteredData({ target: "filtered", range: { max: 2 } });
  const transform = after.semanticSpec.datasets.at(-1).transform[0];

  assert.deepEqual(rowIds(after), [1, 4]);
  assert.deepEqual(transform.range, {
    min: 1,
    minInclusive: true,
    max: 2,
    maxInclusive: false
  });
});
