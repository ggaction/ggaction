import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { createCarsRegressionScatterplotValues } from
  "../../../charts/cars-regression-scatterplot/reference-values.js";
import { loadCars } from "../../../support/data.js";

const rows = [
  { category: "A", value: 1 },
  { category: "B", value: 2 },
  { category: "A", value: 3 },
  { category: null, value: 4 }
];

test("filters the current dataset through wrapped derived-data actions", () => {
  const source = chart().createData({ id: "rows", values: rows });
  const program = source.filterData({
    id: "selected",
    field: "category",
    oneOf: ["A"]
  });

  assert.deepEqual(program.semanticSpec.datasets[1], {
    schema: program.semanticSpec.datasets[1].schema,
    id: "selected",
    source: "rows",
    transform: [{ type: "filter", field: "category", oneOf: ["A"] }],
    values: [rows[0], rows[2]]
  });
  assert.equal(program.context.currentData, "selected");
  assert.deepEqual(program.trace.children.at(-1).children.map(node => node.op), [
    "createDerivedData",
    "materializeFilteredData"
  ]);
  assert.deepEqual(
    program.trace.children.at(-1).children[0].children.map(node => node.op),
    ["editSemantic", "editSemantic"]
  );
  assert.deepEqual(
    program.trace.children.at(-1).children[1].children.map(node => node.op),
    ["editSemantic"]
  );
  assert.deepEqual(source.semanticSpec.datasets, [{ id: "rows", values: rows, schema: source.semanticSpec.datasets[0].schema }]);
});

test("supports an explicit source and scalar filter values", () => {
  const program = chart()
    .createData({ id: "first", values: [] })
    .createData({ id: "rows", values: rows })
    .filterData({
      id: "selected",
      source: "rows",
      field: "category",
      oneOf: ["B", null]
    });

  assert.deepEqual(
    program.semanticSpec.datasets.at(-1).values.map(row => row.value),
    [2, 4]
  );
});

test("owns transform options and materialized rows", () => {
  const input = structuredClone(rows);
  const oneOf = ["A"];
  const program = chart()
    .createData({ id: "rows", values: input })
    .filterData({ id: "selected", field: "category", oneOf });

  oneOf[0] = "B";
  input[0].value = 99;

  assert.deepEqual(program.semanticSpec.datasets[1].transform[0].oneOf, ["A"]);
  assert.deepEqual(
    program.semanticSpec.datasets[1].values.map(row => row.value),
    [1, 3]
  );
});

test("validates filter inference, options, and derived state", () => {
  const base = chart().createData({ id: "rows", values: rows });

  assert.throws(
    () => chart().filterData({ id: "selected", field: "category", oneOf: ["A"] }),
    /Source dataset id/
  );
  assert.throws(
    () => base.filterData({ id: "selected", field: "", oneOf: ["A"] }),
    /non-empty field/
  );
  assert.throws(
    () => base.filterData({ id: "selected", field: "category", oneOf: [] }),
    /oneOf must be a non-empty dense array/
  );
  assert.throws(
    () => base.filterData({
      id: "selected",
      field: "category",
      oneOf: ["A"],
      unknown: true
    }),
    /Unknown filterData option/
  );
  const filtered = base.filterData({
    id: "selected",
    field: "category",
    oneOf: ["A"]
  });
  assert.throws(
    () => filtered.filterData({
      id: "selected",
      source: "rows",
      field: "category",
      oneOf: ["B"]
    }),
    /already exists/
  );
  assert.throws(
    () => filtered.materializeFilteredData({ id: "selected" }),
    /already materialized/
  );
});

test("matches the regression scatterplot primitive filter contract", () => {
  const cars = loadCars();
  const expected = createCarsRegressionScatterplotValues(cars).filteredRows;
  const program = chart()
    .createData({ id: "cars", values: cars })
    .filterData({
      id: "selectedCars",
      field: "Origin",
      oneOf: ["Japan", "USA"]
    });

  assert.deepEqual(program.semanticSpec.datasets[1].values, expected);
});

test("supports every strict comparison operator without type coercion", () => {
  const mixed = [
    { id: "one", value: 1 },
    { id: "two", value: 2 },
    { id: "three", value: 3 },
    { id: "string", value: "2" },
    { id: "null", value: null },
    { id: "missing" },
    { id: "nan", value: Number.NaN }
  ];
  const expected = {
    eq: ["two"],
    neq: ["one", "three", "string", "null", "missing", "nan"],
    lt: ["one"],
    lte: ["one", "two"],
    gt: ["three"],
    gte: ["two", "three"]
  };

  for (const [op, ids] of Object.entries(expected)) {
    const program = chart()
      .createData({ id: "rows", values: mixed })
      .filterData({
        id: "selected",
        field: "value",
        predicate: { op, value: 2 }
      });
    assert.deepEqual(
      program.semanticSpec.datasets[1].values.map(row => row.id),
      ids
    );
  }
});

test("orders strings and excludes sparse or incompatible ordered values", () => {
  const values = [
    { id: 1, value: "alpha" },
    { id: 2, value: 10 },
    { id: 3, value: "beta" },
    { id: 4 },
    { id: 5, value: "gamma" }
  ];
  const program = chart()
    .createData({ id: "rows", values })
    .filterData({
      id: "selected",
      field: "value",
      predicate: { op: "gte", value: "beta" }
    });

  assert.deepEqual(
    program.semanticSpec.datasets[1].values.map(row => row.id),
    [3, 5]
  );
});

test("resolves inclusive and exclusive range endpoints", () => {
  const values = [
    { id: 1, value: 1 },
    { id: 2, value: 2 },
    { id: 3, value: 3 },
    { id: 4, value: "2" },
    { id: 5 }
  ];
  const base = chart().createData({ id: "rows", values });
  const inclusive = base.filterData({
    id: "inclusive",
    field: "value",
    range: { min: 1, max: 3 }
  });
  const exclusive = base.filterData({
    id: "exclusive",
    field: "value",
    range: { min: 1, max: 3, inclusive: false }
  });
  const empty = base.filterData({
    id: "empty",
    field: "value",
    range: { min: 2, max: 2, inclusive: false }
  });

  assert.deepEqual(inclusive.semanticSpec.datasets[1].transform[0].range, {
    min: 1,
    minInclusive: true,
    max: 3,
    maxInclusive: true
  });
  assert.deepEqual(
    inclusive.semanticSpec.datasets[1].values.map(row => row.id),
    [1, 2, 3]
  );
  assert.deepEqual(
    exclusive.semanticSpec.datasets[1].values.map(row => row.id),
    [2]
  );
  assert.deepEqual(empty.semanticSpec.datasets[1].values, []);
});

test("owns predicate and range provenance", () => {
  const predicate = { op: "gte", value: 2 };
  const range = { min: 1, max: 3 };
  const base = chart().createData({ id: "rows", values: rows });
  const compared = base.filterData({
    id: "compared",
    field: "value",
    predicate
  });
  const ranged = base.filterData({
    id: "ranged",
    field: "value",
    range
  });

  predicate.value = 99;
  range.min = 99;
  assert.deepEqual(compared.semanticSpec.datasets[1].transform[0].predicate, {
    op: "gte",
    value: 2
  });
  assert.deepEqual(ranged.semanticSpec.datasets[1].transform[0].range, {
    min: 1,
    minInclusive: true,
    max: 3,
    maxInclusive: true
  });
});

test("validates filter mode exclusivity and ordered operands", () => {
  const base = chart().createData({ id: "rows", values: rows });
  const invalid = [{}, {
    oneOf: [1],
    predicate: { op: "eq", value: 1 }
  }, {
    predicate: { op: "near", value: 1 }
  }, {
    predicate: { op: "gte", value: true }
  }, {
    predicate: { op: "gte" }
  }, {
    range: { min: 3, max: 1 }
  }, {
    range: { min: 1, max: "3" }
  }, {
    range: { min: 1, max: 3, inclusive: "yes" }
  }];

  for (const options of invalid) {
    assert.throws(
      () => base.filterData({
        id: "selected",
        field: "value",
        ...options
      }),
      /filter|comparison|predicate|range|exactly/i
    );
  }
  assert.deepEqual(base.semanticSpec.datasets, [{
    id: "rows", values: rows, schema: base.semanticSpec.datasets[0].schema
  }]);
});
