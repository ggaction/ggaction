import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";
import {
  deriveLinearRegression,
  studentTCritical
} from "../../../../src/grammar/regression.js";
import { createCarsRegressionScatterplotValues } from
  "../../../fixtures/carsRegressionScatterplotValues.js";
import { loadCars } from "../../../support/data.js";

test("derives grouped OLS rows at observed unique x values", () => {
  const expected = createCarsRegressionScatterplotValues(loadCars());
  const result = deriveLinearRegression(expected.filteredRows, {
    x: "Displacement",
    y: "Acceleration",
    groupBy: "Origin",
    confidence: 0.95
  });

  assert.deepEqual(result.values, expected.regressionRows);
  assert.deepEqual(result.groups, ["USA", "Japan"]);
  assert.deepEqual(result.models.map(model => model.xValues.length), [48, 25]);
  assert.ok(Math.abs(result.models[0].slope + 0.017898745486587077) < 1e-12);
  assert.ok(Math.abs(studentTCritical(0.95, 252) - 1.9694223653655463) < 1e-12);
});

test("creates immutable regression provenance and concrete values", () => {
  const cars = loadCars();
  const expected = createCarsRegressionScatterplotValues(cars);
  const filtered = chart()
    .createData({ id: "cars", values: cars })
    .filterData({
      id: "selectedCars",
      field: "Origin",
      oneOf: ["Japan", "USA"]
    });
  const program = filtered.createRegressionData({
    id: "regressionData",
    x: "Displacement",
    y: "Acceleration",
    groupBy: "Origin"
  });

  assert.deepEqual(program.semanticSpec.datasets[2], {
    id: "regressionData",
    source: "selectedCars",
    transform: [{
      type: "regression",
      method: "linear",
      x: "Displacement",
      y: "Acceleration",
      groupBy: "Origin",
      confidence: 0.95,
      interval: "mean"
    }],
    values: expected.regressionRows
  });
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[2].values), true);
  assert.equal(filtered.semanticSpec.datasets.length, 2);
  const node = program.trace.children.at(-1);
  assert.deepEqual(node.children.map(child => child.op), [
    "createDerivedData",
    "materializeRegressionData"
  ]);
});

test("supports ungrouped regression and rejects degenerate groups", () => {
  const result = deriveLinearRegression([
    { x: 0, y: 1 },
    { x: 1, y: 3 },
    { x: 2, y: 5 }
  ], { x: "x", y: "y" });
  assert.deepEqual(result.groups, [undefined]);
  assert.deepEqual(result.values.map(row => row.y), [1, 3, 5]);
  assert.equal(Object.hasOwn(result.values[0], "group"), false);

  assert.throws(
    () => deriveLinearRegression([
      { x: 1, y: 1, group: "A" },
      { x: 2, y: 2, group: "A" }
    ], { x: "x", y: "y", groupBy: "group" }),
    /at least three rows/
  );
  assert.throws(
    () => deriveLinearRegression([
      { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }
    ], { x: "x", y: "y" }),
    /varying x values/
  );
});

test("validates regression action options and source inference", () => {
  const program = chart().createData({
    id: "data",
    values: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]
  });
  assert.throws(
    () => program.createRegressionData({ id: "fit", x: "x", y: "y", confidence: 1 }),
    /between 0 and 1/
  );
  assert.throws(
    () => program.createRegressionData({ id: "fit", x: "x", y: "y", method: "loess" }),
    /Unsupported regression method/
  );
  assert.throws(
    () => program.createRegressionData({ id: "fit", x: "missing", y: "y" }),
    /finite number/
  );
  assert.throws(
    () => chart().createRegressionData({ id: "fit", x: "x", y: "y" }),
    /Source dataset id/
  );
  assert.throws(
    () => program.createRegressionData({ id: "fit", x: "x", y: "y", extra: true }),
    /Unknown createRegressionData option/
  );
});
