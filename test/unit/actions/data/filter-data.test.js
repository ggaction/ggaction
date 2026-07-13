import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { createCarsRegressionScatterplotValues } from
  "../../../fixtures/carsRegressionScatterplotValues.js";
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
  assert.deepEqual(source.semanticSpec.datasets, [{ id: "rows", values: rows }]);
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
    /oneOf must be a non-empty array/
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
