import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const ratio = {
  op: "divide",
  left: { field: "part" },
  right: { field: "whole" }
};

test("createComputedData preserves row grain and materializes closed arithmetic", () => {
  const rows = [
    { group: "A", part: 2, whole: 4 },
    { group: "B", part: 3, whole: 12 }
  ];
  const source = chart().createData({ id: "source", values: rows });
  const program = source.createComputedData({
    id: "shares",
    as: "share",
    expression: ratio
  });

  assert.deepEqual(program.semanticSpec.datasets[1], {
    id: "shares",
    source: "source",
    transform: [{ type: "computed", as: "share", expression: ratio }],
    values: [
      { ...rows[0], share: 0.5 },
      { ...rows[1], share: 0.25 }
    ]
  });
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createDerivedData", "materializeComputedData"]
  );
  assert.deepEqual(source.semanticSpec.datasets, [{ id: "source", values: rows }]);
});

test("createComputedData composes binary, unary, field, and finite constants", () => {
  const program = chart()
    .createData({ id: "source", values: [{ actual: 8, target: 10 }] })
    .createComputedData({
      id: "difference",
      as: "distance",
      expression: {
        op: "absolute",
        operand: {
          op: "subtract",
          left: { field: "actual" },
          right: {
            op: "multiply",
            left: { field: "target" },
            right: { constant: 0.5 }
          }
        }
      }
    });
  assert.equal(program.semanticSpec.datasets[1].values[0].distance, 3);
});

test("createComputedData rejects malformed and non-finite calculations atomically", () => {
  const source = chart().createData({
    id: "source",
    values: [{ part: 1, whole: 0 }]
  });
  const snapshot = JSON.stringify(source);
  const invalid = [
    [{ as: "part", expression: { field: "part" } }, /already exists/],
    [{ as: "x", expression: { field: "missing" } }, /does not contain field/],
    [{ as: "x", expression: ratio }, /divide by zero/],
    [{ as: "x", expression: { constant: Infinity } }, /finite number/],
    [{ as: "x", expression: { field: "part", constant: 1 } }, /exactly one/],
    [{ as: "x", expression: { op: "power", left: { constant: 2 }, right: { constant: 3 } } }, /Unsupported/],
    [{ as: "x", expression: { op: "negate" } }, /requires an operand/],
    [{ as: "x", expression: { field: "part", extra: true } }, /Unknown computed field/],
    [{ as: "x", expression: { field: "part" }, extra: true }, /Unknown createComputedData option/]
  ];
  invalid.forEach(([options, error], index) => {
    assert.throws(
      () => source.createComputedData({ id: `bad${index}`, ...options }),
      error
    );
  });
  const overflow = chart().createData({
    id: "source",
    values: [{ a: Number.MAX_VALUE, b: 2 }]
  });
  assert.throws(
    () => overflow.createComputedData({
      id: "bad",
      as: "x",
      expression: { op: "multiply", left: { field: "a" }, right: { field: "b" } }
    }),
    /not finite/
  );
  let deep = { field: "part" };
  for (let index = 0; index < 17; index += 1) {
    deep = { op: "negate", operand: deep };
  }
  assert.throws(
    () => source.createComputedData({ id: "deep", as: "x", expression: deep }),
    /depth 16/
  );
  let large = { constant: 1 };
  for (let index = 0; index < 7; index += 1) {
    large = { op: "add", left: large, right: structuredClone(large) };
  }
  assert.throws(
    () => source.createComputedData({ id: "large", as: "x", expression: large }),
    /128 nodes/
  );
  assert.equal(JSON.stringify(source), snapshot);
});

test("createComputedData owns expressions and feeds quantitative encodings", () => {
  const expression = {
    op: "add",
    left: { field: "a" },
    right: { constant: 1 }
  };
  const program = chart()
    .createCanvas()
    .createData({ id: "source", values: [{ a: 1 }, { a: 2 }] })
    .createComputedData({ id: "computed", as: "b", expression })
    .createPointMark({ id: "points", data: "computed" })
    .encodeX({ target: "points", field: "a", fieldType: "quantitative" })
    .encodeY({ target: "points", field: "b", fieldType: "quantitative" });
  expression.right.constant = 100;
  assert.equal(program.semanticSpec.datasets[1].transform[0].expression.right.constant, 1);
  assert.equal(program.graphicSpec.objects.points.items.length, 2);
});
