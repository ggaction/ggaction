import assert from "node:assert/strict";
import test from "node:test";

import {
  datasetFixtureReport,
  fixtureRows,
  loadCars,
  loadedDatasetIds
} from "../support/data.js";

test("loads only the dataset requested by a test", () => {
  assert.deepEqual(loadedDatasetIds(), []);
  const cars = loadCars();
  assert.deepEqual(loadedDatasetIds(), ["cars"]);
  assert.equal(cars.length, 406);
  assert.notStrictEqual(cars, fixtureRows("cars"));
  assert.equal(Object.isFrozen(fixtureRows("cars")), true);
});

test("locks every reference dataset by row count, bytes, and sha256", () => {
  const report = datasetFixtureReport();
  assert.deepEqual(
    report.map(({ id }) => id),
    [
      "cars",
      "jobs",
      "gapminder",
      "nightingaleRose",
      "imdbSelected",
      "fashionTsne",
      "imdbTop1000"
    ]
  );
  for (const item of report) {
    assert.deepEqual(
      { rows: item.rows, bytes: item.bytes, sha256: item.sha256 },
      item.expected,
      item.id
    );
  }
});
