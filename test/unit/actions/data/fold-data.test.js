import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = [
  { region: "North", apples: 3, pears: 5 },
  { region: "South", apples: 2, pears: 4 }
];

test("createFoldData preserves source cells in stable row-major field order", () => {
  const source = chart().createData({ id: "source", values: rows });
  const program = source.createFoldData({
    id: "long",
    fields: ["pears", "apples"],
    as: { key: "fruit", value: "amount" }
  });

  assert.deepEqual(program.semanticSpec.datasets[1], {
    id: "long",
    source: "source",
    transform: [{
      type: "fold",
      fields: ["pears", "apples"],
      as: { key: "fruit", value: "amount" }
    }],
    values: [
      { ...rows[0], fruit: "pears", amount: 5 },
      { ...rows[0], fruit: "apples", amount: 3 },
      { ...rows[1], fruit: "pears", amount: 4 },
      { ...rows[1], fruit: "apples", amount: 2 }
    ]
  });
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createDerivedData", "materializeFoldData"]
  );
  assert.deepEqual(source.semanticSpec.datasets, [{ id: "source", values: rows }]);
});

test("createFoldData uses defaults, supports empty input, and feeds ordinary marks", () => {
  const program = chart()
    .createCanvas()
    .createData({ id: "source", values: rows })
    .createFoldData({ id: "long", fields: ["apples", "pears"] })
    .createPointMark({ id: "points", data: "long" })
    .encodeX({ target: "points", field: "key", fieldType: "nominal" })
    .encodeY({ target: "points", field: "value", fieldType: "quantitative" });
  assert.equal(program.graphicSpec.objects.points.items.length, 4);

  const empty = chart()
    .createData({ id: "source", values: [] })
    .createFoldData({ id: "long", fields: ["apples"] });
  assert.deepEqual(empty.semanticSpec.datasets[1].values, []);
});

test("createFoldData rejects invalid fields, aliases, types, and missing cells atomically", () => {
  const source = chart().createData({ id: "source", values: rows });
  const snapshot = JSON.stringify(source);
  const invalid = [
    [{ fields: [] }, /non-empty array/],
    [{ fields: ["apples", "apples"] }, /unique/],
    [{ fields: ["missing"] }, /does not contain field/],
    [{ fields: ["apples"], as: { key: "region" } }, /already exists/],
    [{ fields: ["apples"], as: { key: "same", value: "same" } }, /unique/],
    [{ fields: ["apples"], as: { extra: "x" } }, /Unknown fold as/],
    [{ fields: ["apples"], extra: true }, /Unknown createFoldData option/]
  ];
  invalid.forEach(([options, error], index) => {
    assert.throws(() => source.createFoldData({ id: `bad${index}`, ...options }), error);
  });

  const mixed = chart().createData({
    id: "source",
    values: [{ a: 1, b: "two" }]
  });
  assert.throws(
    () => mixed.createFoldData({ id: "long", fields: ["a", "b"] }),
    /one common primitive type/
  );
  const missing = chart().createData({
    id: "source",
    values: [{ a: 1 }, { a: null }]
  });
  assert.throws(
    () => missing.createFoldData({ id: "long", fields: ["a"] }),
    /missing at row 1/
  );
  assert.equal(JSON.stringify(source), snapshot);
});

test("createFoldData bounds field count and expanded output", () => {
  assert.throws(
    () => chart().createData({ id: "source", values: [] }).createFoldData({
      id: "long",
      fields: Array.from({ length: 65 }, (_, index) => `v${index}`)
    }),
    /more than 64/
  );
  const values = Array.from({ length: 5_001 }, () => ({ a: 1, b: 2 }));
  assert.throws(
    () => chart().createData({ id: "source", values }).createFoldData({
      id: "long",
      fields: ["a", "b"]
    }),
    /cannot exceed 10000 rows/
  );
});
