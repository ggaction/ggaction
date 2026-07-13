import assert from "node:assert/strict";
import test from "node:test";

import { createCarsRegressionScatterplotValues } from
  "../fixtures/carsRegressionScatterplotValues.js";
import { loadCars } from "../fixtures/data.js";

function assertApproximately(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}.`
  );
}

test("filters cars and fits deterministic Origin regression models", () => {
  const result = createCarsRegressionScatterplotValues(loadCars());

  assert.equal(result.filteredRows.length, 333);
  assert.deepEqual(result.groupDomain, ["USA", "Japan"]);
  assert.deepEqual(
    result.models.map(model => model.count),
    [254, 79]
  );
  assert.deepEqual(
    result.models.map(model => model.degreesOfFreedom),
    [252, 77]
  );
  assert.deepEqual(
    result.models.map(model => model.xValues.length),
    [48, 25]
  );
  assert.equal(result.regressionRows.length, 73);

  const [usa, japan] = result.models;
  assertApproximately(usa.critical, 1.9694223653655463, 1e-12);
  assertApproximately(japan.critical, 1.9912543953883841, 1e-12);
});

test("creates sorted observed-x rows with mean-response confidence bounds", () => {
  const result = createCarsRegressionScatterplotValues(loadCars());
  const usaRows = result.regressionRows.filter(row => row.Origin === "USA");
  const japanRows = result.regressionRows.filter(row => row.Origin === "Japan");

  assert.deepEqual(
    usaRows.map(row => row.Displacement),
    [...new Set(result.filteredRows
      .filter(row => row.Origin === "USA")
      .map(row => row.Displacement))].sort((left, right) => left - right)
  );
  assert.deepEqual(
    japanRows.map(row => row.Displacement),
    [...new Set(result.filteredRows
      .filter(row => row.Origin === "Japan")
      .map(row => row.Displacement))].sort((left, right) => left - right)
  );

  for (const row of result.regressionRows) {
    assert.ok(row.__regression_ci_lower < row.Acceleration);
    assert.ok(row.Acceleration < row.__regression_ci_upper);
  }

  assert.deepEqual(result.fields, {
    x: "Displacement",
    y: "Acceleration",
    group: "Origin",
    lower: "__regression_ci_lower",
    upper: "__regression_ci_upper"
  });
});

test("matches representative OLS and confidence interval values", () => {
  const result = createCarsRegressionScatterplotValues(loadCars());
  const usa = result.models.find(model => model.group === "USA");
  const japan = result.models.find(model => model.group === "Japan");
  const firstUsa = result.regressionRows.find(row => row.Origin === "USA");
  const lastJapan = result.regressionRows.findLast(row => row.Origin === "Japan");

  assertApproximately(usa.slope, -0.017898745486587077);
  assertApproximately(usa.intercept, 19.38024585193135);
  assertApproximately(japan.slope, -0.04524797107958751);
  assertApproximately(japan.intercept, 20.819519459997124);
  assertApproximately(firstUsa.Acceleration, 17.858852485571447);
  assertApproximately(firstUsa.__regression_ci_lower, 17.33717789489177);
  assertApproximately(firstUsa.__regression_ci_upper, 18.380527076251123);
  assertApproximately(lastJapan.Acceleration, 13.217860318626423);
  assertApproximately(lastJapan.__regression_ci_lower, 12.097189140719317);
  assertApproximately(lastJapan.__regression_ci_upper, 14.338531496533529);
});

test("rejects invalid options and degenerate regression groups", () => {
  assert.throws(
    () => createCarsRegressionScatterplotValues({}, {}),
    /Cars must be an array/
  );
  assert.throws(
    () => createCarsRegressionScatterplotValues([], { groups: [] }),
    /groups must be unique non-empty strings/
  );
  assert.throws(
    () => createCarsRegressionScatterplotValues([], { confidence: 1 }),
    /confidence must be between 0 and 1/
  );
  assert.throws(
    () => createCarsRegressionScatterplotValues([], {}),
    /at least one valid row/
  );
  assert.throws(
    () => createCarsRegressionScatterplotValues([
      { Displacement: 10, Acceleration: 1, Origin: "USA" },
      { Displacement: 20, Acceleration: 2, Origin: "USA" }
    ]),
    /requires at least three rows/
  );
  assert.throws(
    () => createCarsRegressionScatterplotValues([
      { Displacement: 10, Acceleration: 1, Origin: "USA" },
      { Displacement: 10, Acceleration: 2, Origin: "USA" },
      { Displacement: 10, Acceleration: 3, Origin: "USA" }
    ]),
    /requires varying x values/
  );
});

test("does not mutate or retain caller-owned car rows", () => {
  const cars = loadCars();
  const before = structuredClone(cars);
  const result = createCarsRegressionScatterplotValues(cars);

  assert.deepEqual(cars, before);
  result.filteredRows[0].Origin = "changed";
  assert.deepEqual(cars, before);
});
