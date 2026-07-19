import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import {
  deriveRegression,
  deriveLinearRegression,
  normalizeRegressionParameters,
  REGRESSION_LOWER_FIELD,
  studentTCritical
} from "../../../../src/grammar/regression/index.js";
import { createCarsRegressionScatterplotValues } from
  "../../../charts/cars-regression-scatterplot/reference-values.js";
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

test("validates the public Student-t wrapper independently from its kernel", () => {
  for (const confidence of [NaN, 0, 1]) {
    assert.throws(
      () => studentTCritical(confidence, 3),
      /Regression confidence must be between 0 and 1/
    );
  }
  for (const degreesOfFreedom of [0, 1.5, Infinity]) {
    assert.throws(
      () => studentTCritical(0.95, degreesOfFreedom),
      /Student-t degrees of freedom must be positive/
    );
  }
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
    () => program.createRegressionData({ id: "fit", x: "x", y: "y", method: "unknown" }),
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

test("derives polynomial, LOESS, and prediction rows from resolved parameters", () => {
  const expectedPolynomial = createCarsRegressionScatterplotValues(loadCars(), {
    method: "polynomial",
    degree: 2
  });
  const polynomial = deriveRegression(expectedPolynomial.filteredRows, {
    x: "Displacement",
    y: "Acceleration",
    groupBy: "Origin",
    method: "polynomial"
  });
  assert.deepEqual(polynomial.values, expectedPolynomial.regressionRows);
  assert.deepEqual(polynomial.parameters, {
    method: "polynomial",
    degree: 2,
    confidence: 0.95,
    interval: "mean"
  });
  assert.deepEqual(
    polynomial.models.map(model => model.coefficients),
    expectedPolynomial.models.map(model => model.coefficients)
  );

  const expectedLoess = createCarsRegressionScatterplotValues(loadCars(), {
    method: "loess",
    span: 0.55
  });
  const loess = deriveRegression(expectedLoess.filteredRows, {
    x: "Displacement",
    y: "Acceleration",
    groupBy: "Origin",
    method: "loess",
    span: 0.55
  });
  assert.deepEqual(loess.values, expectedLoess.regressionRows);
  assert.deepEqual(loess.parameters, { method: "loess", span: 0.55 });
  assert.deepEqual(loess.models.map(model => model.neighborCount), [140, 44]);
  assert.equal(loess.fields.lower, undefined);

  const expectedPrediction = createCarsRegressionScatterplotValues(loadCars(), {
    interval: "prediction"
  });
  const prediction = deriveRegression(expectedPrediction.filteredRows, {
    x: "Displacement",
    y: "Acceleration",
    groupBy: "Origin",
    interval: "prediction"
  });
  assert.deepEqual(prediction.values, expectedPrediction.regressionRows);
});

test("stores method defaults in immutable regression provenance", () => {
  const source = chart().createData({
    id: "data",
    values: [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 5 },
      { x: 3, y: 10 }
    ]
  });
  const polynomial = source.createRegressionData({
    id: "quadratic",
    x: "x",
    y: "y",
    method: "polynomial"
  });
  const loess = source.createRegressionData({
    id: "local",
    x: "x",
    y: "y",
    method: "loess"
  });
  const prediction = source.createRegressionData({
    id: "prediction",
    x: "x",
    y: "y",
    interval: "prediction"
  });

  assert.deepEqual(polynomial.semanticSpec.datasets[1].transform[0], {
    type: "regression",
    method: "polynomial",
    x: "x",
    y: "y",
    degree: 2,
    confidence: 0.95,
    interval: "mean"
  });
  assert.deepEqual(loess.semanticSpec.datasets[1].transform[0], {
    type: "regression",
    method: "loess",
    x: "x",
    y: "y",
    span: 0.75
  });
  assert.equal(
    Object.hasOwn(loess.semanticSpec.datasets[1].values[0], REGRESSION_LOWER_FIELD),
    false
  );
  assert.equal(
    prediction.semanticSpec.datasets[1].transform[0].interval,
    "prediction"
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
});

test("validates method-specific regression boundaries and singular groups", () => {
  assert.deepEqual(normalizeRegressionParameters({ method: "polynomial" }), {
    method: "polynomial",
    degree: 2,
    confidence: 0.95,
    interval: "mean"
  });
  assert.deepEqual(normalizeRegressionParameters({ method: "loess" }), {
    method: "loess",
    span: 0.75
  });
  for (const options of [
    { method: "linear", degree: 2 },
    { method: "linear", span: 0.5 },
    { method: "polynomial", span: 0.5 },
    { method: "loess", degree: 2 },
    { method: "loess", confidence: 0.95 },
    { method: "loess", interval: "mean" }
  ]) {
    assert.throws(() => normalizeRegressionParameters(options), /requires|does not support/);
  }
  for (const degree of [0, 1.5, Infinity]) {
    assert.throws(
      () => normalizeRegressionParameters({ method: "polynomial", degree }),
      /positive integer/
    );
  }
  for (const span of [0, -0.1, 1.1, Infinity]) {
    assert.throws(
      () => normalizeRegressionParameters({ method: "loess", span }),
      /greater than zero/
    );
  }
  assert.deepEqual(
    normalizeRegressionParameters({ method: "loess", span: 1 }),
    { method: "loess", span: 1 }
  );
  assert.deepEqual(
    normalizeRegressionParameters({ confidence: 1e-6 }),
    { method: "linear", confidence: 1e-6, interval: "mean" }
  );
  assert.throws(
    () => deriveRegression([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 }
    ], { x: "x", y: "y", method: "polynomial", degree: 2 }),
    /at least 4 rows/
  );
  assert.throws(
    () => deriveRegression([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 }
    ], { x: "x", y: "y", method: "polynomial", degree: 2 }),
    /3 distinct x values/
  );
});

test("keeps polynomial degree one equivalent to linear and supports prediction bounds", () => {
  const rows = [
    { x: 0, y: 1 },
    { x: 1, y: 2.5 },
    { x: 2, y: 4 },
    { x: 3, y: 7 }
  ];
  const linear = deriveRegression(rows, { x: "x", y: "y" });
  const degreeOne = deriveRegression(rows, {
    x: "x",
    y: "y",
    method: "polynomial",
    degree: 1
  });
  degreeOne.values.forEach((row, index) => {
    assert.ok(Math.abs(row.y - linear.values[index].y) < 1e-12);
  });
  assert.equal(degreeOne.parameters.method, "polynomial");
  assert.equal(degreeOne.parameters.degree, 1);

  const mean = deriveRegression(rows, {
    x: "x",
    y: "y",
    method: "polynomial",
    degree: 2
  });
  const prediction = deriveRegression(rows, {
    x: "x",
    y: "y",
    method: "polynomial",
    degree: 2,
    interval: "prediction"
  });
  for (let index = 0; index < mean.values.length; index += 1) {
    assert.ok(
      prediction.values[index][REGRESSION_LOWER_FIELD] <=
      mean.values[index][REGRESSION_LOWER_FIELD]
    );
    assert.ok(
      prediction.values[index].__regression_ci_upper >=
      mean.values[index].__regression_ci_upper
    );
  }
});
