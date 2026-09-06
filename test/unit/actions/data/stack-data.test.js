import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = [
  { category: "A", series: "one", amount: 2 },
  { category: "A", series: "two", amount: 3 },
  { category: "B", series: "two", amount: 4 },
  { category: "B", series: "one", amount: 1 },
  { category: "B", series: "zero", amount: 0 }
];

function options(extra = {}) {
  return {
    id: "stacked",
    category: "category",
    group: "series",
    value: "amount",
    ...extra
  };
}

test("createStackData reuses stable stack math and preserves source row order", () => {
  const source = chart().createData({ id: "source", values: rows });
  const program = source.createStackData(options());
  const values = program.semanticSpec.datasets[1].values;

  assert.deepEqual(values.map(row => [row.amount_start, row.amount_end, row.amount_value, row.amount_share]), [
    [0, 2, 2, 0.4],
    [2, 5, 3, 0.6],
    [1, 5, 4, 0.8],
    [0, 1, 1, 0.2],
    [5, 5, 0, 0]
  ]);
  assert.deepEqual(program.semanticSpec.datasets[1].transform, [{
    type: "stack",
    category: "category",
    group: "series",
    value: "amount",
    mode: "stack",
    as: {
      start: "amount_start",
      end: "amount_end",
      value: "amount_value",
      share: "amount_share"
    }
  }]);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createDerivedData", "materializeStackData"]
  );
  assert.deepEqual(source.semanticSpec.datasets, [{ id: "source", values: rows }]);
});

test("createStackData exposes fill, center, and diverging modes through shared math", () => {
  const base = chart().createData({ id: "source", values: rows.slice(0, 2) });
  const fill = base.createStackData(options({ id: "fill", mode: "fill" }));
  assert.deepEqual(fill.semanticSpec.datasets[1].values.map(row => [row.amount_start, row.amount_end]), [
    [0, 0.4], [0.4, 1]
  ]);
  const center = base.createStackData(options({ id: "center", mode: "center" }));
  assert.deepEqual(center.semanticSpec.datasets[1].values.map(row => [row.amount_start, row.amount_end]), [
    [-2.5, -0.5], [-0.5, 2.5]
  ]);
  const diverging = chart().createData({
    id: "source",
    values: [
      { category: "A", series: "positive", amount: 3 },
      { category: "A", series: "negative", amount: -2 }
    ]
  }).createStackData(options({ id: "diverging", mode: "diverging" }));
  assert.deepEqual(
    diverging.semanticSpec.datasets[1].values.map(row => [row.amount_start, row.amount_end, row.amount_share]),
    [[0, 3, 0.6], [0, -2, 0.4]]
  );
});

test("createStackData produces custom ranged fields directly consumable by marks", () => {
  const program = chart()
    .createCanvas()
    .createData({ id: "source", values: rows.slice(0, 2) })
    .createStackData(options({
      as: { start: "y0", end: "y1", value: "raw", share: "share" }
    }))
    .createBarMark({ id: "cells", data: "stacked" })
    .encodeX({ target: "cells", field: "category", fieldType: "nominal" })
    .encodeY({ target: "cells", field: "y0", fieldType: "quantitative" })
    .encodeY2({ target: "cells", field: "y1", fieldType: "quantitative" });
  assert.equal(program.graphicSpec.objects.cells.items.length, 2);
});

test("createStackData rejects invalid cells, modes, aliases, and signs atomically", () => {
  const source = chart().createData({ id: "source", values: rows });
  const snapshot = JSON.stringify(source);
  const invalid = [
    [{ category: "series" }, /must be unique/],
    [{ mode: "overlay" }, /Unsupported stack mode/],
    [{ as: { start: "category" } }, /already exists/],
    [{ as: { start: "x", end: "x" } }, /unique/],
    [{ as: { extra: "x" } }, /Unknown stack as/],
    [{ extra: true }, /Unknown createStackData option/]
  ];
  invalid.forEach(([extra, error], index) => {
    assert.throws(() => source.createStackData(options({ id: `bad${index}`, ...extra })), error);
  });
  const duplicate = chart().createData({
    id: "source",
    values: [rows[0], { ...rows[0], amount: 4 }]
  });
  assert.throws(() => duplicate.createStackData(options()), /one row per category\/group/);
  const missing = chart().createData({ id: "source", values: [{ category: "A", series: "one" }] });
  assert.throws(() => missing.createStackData(options()), /does not contain field "amount"/);
  const negative = chart().createData({
    id: "source",
    values: [{ category: "A", series: "one", amount: -1 }]
  });
  assert.throws(() => negative.createStackData(options()), /requires non-negative/);
  assert.equal(JSON.stringify(source), snapshot);
});
