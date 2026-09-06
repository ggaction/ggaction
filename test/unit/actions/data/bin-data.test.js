import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = [
  { value: 0, id: "a" },
  { value: 1, id: "b" },
  { value: 2, id: "c" },
  { value: 4, id: "d" }
];

test("createBinData reuses exact histogram boundary and last-bin rules", () => {
  const source = chart().createData({ id: "source", values: rows });
  const program = source.createBinData({
    id: "bins",
    field: "value",
    boundaries: [0, 2, 4],
    members: true,
    as: { lower: "lo", upper: "hi", count: "n", members: "rows" }
  });
  const data = program.semanticSpec.datasets[1];

  assert.deepEqual(data.values, [
    { lo: 0, hi: 2, n: 2, rows: [rows[0], rows[1]] },
    { lo: 2, hi: 4, n: 2, rows: [rows[2], rows[3]] }
  ]);
  assert.deepEqual(data.transform[0].resolved, {
    domain: [0, 4],
    boundaries: [0, 2, 4]
  });
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createDerivedData", "materializeBinData"]
  );
  assert.deepEqual(source.semanticSpec.datasets, [{ id: "source", values: rows }]);
});

test("createBinData supports maxBins, steps, empty-bin omission, and resolved provenance", () => {
  const stepped = chart()
    .createData({ id: "source", values: [{ value: 0 }, { value: 4 }] })
    .createBinData({
      id: "bins",
      field: "value",
      step: 1,
      extent: [0, 4],
      includeEmpty: false
    });
  assert.deepEqual(stepped.semanticSpec.datasets[1].values, [
    { value_start: 0, value_end: 1, count: 1 },
    { value_start: 3, value_end: 4, count: 1 }
  ]);
  assert.equal(stepped.semanticSpec.datasets[1].transform[0].resolved.step, 1);

  const automatic = chart()
    .createData({ id: "source", values: [{ value: 1 }, { value: 3 }] })
    .createBinData({ id: "bins", field: "value", maxBins: 2, nice: false });
  assert.equal(automatic.semanticSpec.datasets[1].values.length, 2);
  assert.equal(
    automatic.semanticSpec.datasets[1].values.reduce((sum, row) => sum + row.count, 0),
    2
  );
});

test("createBinData rejects invalid bin policies and input atomically", () => {
  const source = chart().createData({ id: "source", values: rows });
  const snapshot = JSON.stringify(source);
  const invalid = [
    [{ field: "value", maxBins: 2, step: 1 }, /only one/],
    [{ field: "value", boundaries: [0, 2, 1] }, /strictly increasing/],
    [{ field: "value", extent: [1, 3] }, /contain the histogram data extent/],
    [{ field: "value", as: { lower: "x", upper: "x" } }, /unique/],
    [{ field: "value", as: { extra: "x" } }, /Unknown bin as/],
    [{ field: "value", members: false, as: { members: "rows" } }, /requires members/],
    [{ field: "value", includeEmpty: "yes" }, /must be a boolean/],
    [{ field: "missing" }, /finite number at row 0/],
    [{ field: "value", extra: true }, /Unknown createBinData option/]
  ];
  invalid.forEach(([options, error], index) => {
    assert.throws(() => source.createBinData({ id: `bad${index}`, ...options }), error);
  });
  const mixed = chart().createData({ id: "source", values: [{ value: 1 }, { value: null }] });
  assert.throws(
    () => mixed.createBinData({ id: "bins", field: "value" }),
    /finite number at row 1/
  );
  assert.equal(JSON.stringify(source), snapshot);
});

test("createBinData produces values directly consumable by ranged marks", () => {
  const program = chart()
    .createCanvas()
    .createData({ id: "source", values: rows })
    .createBinData({ id: "bins", field: "value", boundaries: [0, 2, 4] })
    .createRectMark({ id: "cells", data: "bins" })
    .encodeX({ target: "cells", field: "value_start" })
    .encodeX2({ target: "cells", field: "value_end" })
    .encodeY({ target: "cells", datum: 0 })
    .encodeY2({ target: "cells", field: "count" });
  assert.equal(program.graphicSpec.objects.cells.items.length, 2);
});
