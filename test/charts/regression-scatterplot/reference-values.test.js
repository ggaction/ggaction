import assert from "node:assert/strict";
import test from "node:test";

import {
  createCarsRegressionScatterplotValues,
  selectRegressionFilterRows
} from "./reference-values.js";
import { loadCars } from "../../support/data.js";

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

test("maps points, confidence bands, lines, axes, and legends concretely", () => {
  const result = createCarsRegressionScatterplotValues(loadCars());

  assert.deepEqual(result.bounds, { x: 80, y: 40, width: 490, height: 370 });
  assert.deepEqual(result.scales, {
    x: { domain: [0, 500], range: [80, 570] },
    y: { domain: [6, 24], range: [410, 40] },
    color: {
      domain: ["USA", "Japan"],
      range: ["#4c78a8", "#f58518"]
    },
    size: { domain: [8, 22.2], range: [24, 196] },
    shape: { domain: ["USA", "Japan"], range: ["circle", "square"] }
  });
  assert.deepEqual(
    result.pointChildren.map(child => child.type).reduce(
      (counts, type) => ({ ...counts, [type]: (counts[type] ?? 0) + 1 }),
      {}
    ),
    { circle: 254, rect: 79 }
  );
  assert.deepEqual(
    result.regressionBands.map(band => [band.group, band.points.length]),
    [["USA", 96], ["Japan", 50]]
  );
  assert.deepEqual(
    result.regressionLines.map(line => [line.group, line.points.length]),
    [["USA", 48], ["Japan", 25]]
  );
  assert.deepEqual(
    result.axes.x.ticks.map(tick => tick.value),
    [0, 100, 200, 300, 400, 500]
  );
  assert.deepEqual(
    result.axes.y.ticks.map(tick => tick.value),
    [10, 15, 20]
  );
  assert.deepEqual(
    result.legends.origin.items.map(item => [item.group, item.shape]),
    [["USA", "circle"], ["Japan", "square"]]
  );
  assert.deepEqual(
    result.legends.size.items.map(item => item.value),
    [8, 11.55, 15.1, 18.65, 22.2]
  );
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
  assert.throws(
    () => createCarsRegressionScatterplotValues(loadCars(), { width: 0 }),
    /positive finite dimensions/
  );
  assert.throws(
    () => createCarsRegressionScatterplotValues(loadCars(), {
      margin: { top: 40, right: 500, bottom: 70, left: 500 }
    }),
    /must leave positive plot bounds/
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

test("selects ordered comparison and inclusive range rows in source order", () => {
  const cars = loadCars();
  const comparison = createCarsRegressionScatterplotValues(cars, {
    filter: {
      field: "Horsepower",
      predicate: { op: "gte", value: 150 }
    }
  });
  const range = createCarsRegressionScatterplotValues(cars, {
    filter: {
      field: "Displacement",
      range: { min: 100, max: 300, inclusive: true }
    }
  });

  assert.equal(comparison.filteredRows.length, 71);
  assert.deepEqual(comparison.groupDomain, ["USA"]);
  assert.equal(comparison.filteredRows[0].Name, "buick skylark 320");
  assert.equal(
    comparison.filteredRows.at(-1).Name,
    "chrysler lebaron town @ country (sw)"
  );
  assert.equal(comparison.regressionRows.length, 15);
  assert.deepEqual(comparison.scales.x.domain, [200, 500]);
  assert.deepEqual(comparison.scales.y.domain, [6, 21]);

  assert.equal(range.filteredRows.length, 205);
  assert.deepEqual(range.groupDomain, ["Europe", "Japan", "USA"]);
  assert.equal(range.filteredRows[0].Name, "citroen ds-21 pallas");
  assert.equal(range.filteredRows.at(-1).Name, "chevy s-10");
  assert.equal(range.regressionRows.length, 57);
  assert.deepEqual(range.scales.x.domain, [100, 300]);
  assert.deepEqual(range.scales.y.domain, [9, 27]);
  assert.ok(range.filteredRows.some(row => row.Displacement === 100));
});

test("locks comparison compatibility and range endpoint policies", () => {
  const rows = [
    { order: 1, value: 1 },
    { order: 2, value: 2 },
    { order: 3, value: 3 },
    { order: 4, value: "2" },
    { order: 5 },
    { order: 6, value: Number.NaN }
  ];
  const select = filter => selectRegressionFilterRows(rows, {
    field: "value",
    ...filter
  }).map(row => row.order);

  assert.deepEqual(
    select({ predicate: { op: "gte", value: 2 } }),
    [2, 3]
  );
  assert.deepEqual(
    select({ range: { min: 1, max: 3, inclusive: true } }),
    [1, 2, 3]
  );
  assert.deepEqual(
    select({ range: { min: 1, max: 3, inclusive: false } }),
    [2]
  );
  assert.deepEqual(
    select({ range: { min: 2, max: 2, inclusive: true } }),
    [2]
  );
  assert.deepEqual(
    select({ range: { min: 2, max: 2, inclusive: false } }),
    []
  );
});
