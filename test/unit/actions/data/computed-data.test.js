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
    schema: program.semanticSpec.datasets[1].schema,
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
  assert.deepEqual(source.semanticSpec.datasets, [{ id: "source", values: rows, schema: source.semanticSpec.datasets[0].schema }]);
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

test("createComputedData evaluates conditionals lazily while preflighting every field", () => {
  const source = chart().createData({
    id: "source",
    values: [{ x: -2 }, { x: 0 }, { x: 4 }]
  });
  const expression = {
    op: "if",
    condition: {
      op: "gt", left: { field: "x" }, right: { constant: 0 }
    },
    then: { op: "log", operand: { field: "x" } },
    else: { constant: null }
  };
  const program = source.createComputedData({ id: "logged", as: "result", expression });
  assert.deepEqual(
    program.semanticSpec.datasets[1].values.map(row => row.result),
    [null, null, Math.log(4)]
  );

  assert.throws(() => source.createComputedData({
    id: "typo",
    as: "result",
    expression: {
      op: "if", condition: { constant: true }, then: { constant: 1 },
      else: { field: "missing" }
    }
  }), /does not contain field "missing"/);

  const empty = chart().createData({ id: "empty", values: [], schema: { fields: [
    { name: "unknown", storageType: "number" }
  ] } }).createComputedData({
    id: "emptyResult", as: "result", expression: { field: "unknown" }
  });
  assert.deepEqual(empty.semanticSpec.datasets[1].values, []);
});

test("createComputedData supports null handling, string composition, and boolean logic", () => {
  const program = chart()
    .createData({
      id: "source",
      values: [{ name: "A", missing: null }, { name: null, missing: undefined }, { name: "C", missing: null }]
    })
    .createComputedData({
      id: "labels",
      as: "label",
      expression: {
        op: "concat",
        operands: [
          { op: "coalesce", operands: [{ field: "name" }, { constant: "Unknown" }] },
          { constant: "!" }
        ]
      }
    })
    .createComputedData({
      id: "flags",
      source: "labels",
      as: "flag",
      expression: {
        op: "and",
        operands: [
          { op: "not", operand: { op: "isNull", operand: { field: "label" } } },
          { op: "isNull", operand: { field: "missing" } }
        ]
      }
    });
  assert.deepEqual(
    program.semanticSpec.datasets[1].values.map(row => row.label),
    ["A!", "Unknown!", "C!"]
  );
  assert.deepEqual(
    program.semanticSpec.datasets[2].values.map(row => row.flag),
    [true, true, true]
  );
});

test("createComputedData uses code-point ordering and short-circuits boolean branches", () => {
  const source = chart().createData({ id: "source", values: [{}] });
  const less = source.createComputedData({
    id: "ordered", as: "result",
    expression: { op: "lt", left: { constant: "😀" }, right: { constant: "\uE000" } }
  });
  assert.equal(less.semanticSpec.datasets[1].values[0].result, false);

  const lazy = source.createComputedData({
    id: "lazy", as: "result",
    expression: {
      op: "and",
      operands: [
        { constant: false },
        {
          op: "gt",
          left: { op: "log", operand: { constant: -1 } },
          right: { constant: 0 }
        }
      ]
    }
  });
  assert.equal(lazy.semanticSpec.datasets[1].values[0].result, false);
});

test("createComputedData rejects typed-expression violations atomically", () => {
  const source = chart().createData({
    id: "source",
    values: [{ x: -1 }, { x: 1 }]
  });
  const before = source;
  const invalid = [
    {
      expression: {
        op: "if",
        condition: { op: "gt", left: { field: "x" }, right: { constant: 0 } },
        then: { constant: 1 }, else: { constant: "negative" }
      },
      error: /one non-null primitive type/
    },
    { expression: { op: "sqrt", operand: { constant: -1 } }, error: /non-negative/ },
    { expression: { op: "log", operand: { constant: 0 } }, error: /positive/ },
    { expression: { op: "concat", operands: [{ constant: 1 }] }, error: /requires strings/ },
    { expression: { op: "and", operands: [{ constant: true }] }, error: /at least 2/ },
    { expression: { op: "eq", left: { constant: 1 }, right: { constant: "1" } }, error: /matching primitive/ }
  ];
  invalid.forEach(({ expression, error }, index) => {
    assert.throws(() => source.createComputedData({
      id: `invalid${index}`, as: "result", expression
    }), error);
  });
  const cycle = { op: "not" };
  cycle.operand = cycle;
  assert.throws(() => source.createComputedData({
    id: "cycle", as: "result", expression: cycle
  }), /circular references|cannot contain cycles/);
  assert.deepEqual(source, before);
});

test("computed strings feed nominal encodings while computed nulls remain invalid quantitatively", () => {
  const labeled = chart()
    .createCanvas()
    .createData({ id: "source", values: [
      { x: 1, name: "A" },
      { x: 2, name: null }
    ] })
    .createComputedData({
      id: "labels", as: "label",
      expression: {
        op: "coalesce",
        operands: [{ field: "name" }, { constant: "Unknown" }]
      }
    })
    .createPointMark({ id: "points", data: "labels" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "x" })
    .encodeColor({ target: "points", field: "label" });
  assert.equal(labeled.semanticSpec.layers[0].encoding.color.fieldType, "nominal");
  assert.deepEqual(
    labeled.graphicSpec.objects.points.items.map(item => item.properties.fill),
    ["#4c78a8", "#f58518"]
  );

  const nullable = chart()
    .createCanvas()
    .createData({ id: "source", values: [{ x: 1 }, { x: -1 }] })
    .createComputedData({
      id: "nullable", as: "result",
      expression: {
        op: "if",
        condition: { op: "gt", left: { field: "x" }, right: { constant: 0 } },
        then: { field: "x" },
        else: { constant: null }
      }
    })
    .createPointMark({ id: "points", data: "nullable" })
    .encodeX({ target: "points", field: "x" });
  assert.throws(
    () => nullable.encodeY({ target: "points", field: "result" }),
    /must contain a finite number at row 1/
  );
});

test("facets preserve computed provenance and filter its row-preserving output", () => {
  const faceted = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ id: "source", values: [
      { facet: "A", x: 1 },
      { facet: "B", x: 2 }
    ] })
    .createComputedData({
      id: "computed", as: "double",
      expression: { op: "multiply", left: { field: "x" }, right: { constant: 2 } }
    })
    .createPointMark({ id: "points", data: "computed" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "double" })
    .facet({ field: "facet", guides: { legend: false } });

  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const computed = child.semanticSpec.datasets.find(dataset =>
      dataset.id === "computed"
    );
    const filtered = child.semanticSpec.datasets.find(dataset => dataset.id === `${id}-data`);
    assert.equal(computed.transform[0].type, "computed");
    assert.equal(filtered.values[0].double, filtered.values[0].x * 2);
    assert.equal(filtered.source, "computed");
    assert.equal(child.semanticSpec.layers[0].data, filtered.id);
  }
});
