import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  datasetFixtureReport,
  fixtureRows,
  loadCars,
  loadedDatasetIds
} from "../support/data.js";
import {
  corpusDatasetIds,
  DATASET_CORPUS,
  datasetDefinition
} from "../support/datasets/catalog.js";
import { parseTypedCsv } from "../support/datasets/csv.js";
import {
  duplicateRows,
  injectMissing,
  renameFields,
  scaleNumericFields,
  shuffleRows
} from "../support/datasets/mutations.js";
import {
  selectStableRows,
  tidyTuesdayFixtureReport,
  tidyTuesdaySourceUrl
} from "../support/datasets/tidytuesday.js";
import {
  loadZooDataset,
  zooFixtureRows,
  zooGeneratorNames
} from "../support/datasets/zoo.js";

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

test("registers a frozen, uniquely identified real-data and edge-case corpus", () => {
  assert.equal(Object.isFrozen(DATASET_CORPUS), true);
  assert.equal(corpusDatasetIds("tidytuesday").length, 5);
  assert.equal(corpusDatasetIds("zoo").length, 19);
  assert.equal(new Set(corpusDatasetIds()).size, 24);
  assert.deepEqual(
    [...zooGeneratorNames()].sort(),
    corpusDatasetIds("zoo")
      .map(id => datasetDefinition(id).generator)
      .sort()
  );
  assert.match(DATASET_CORPUS.tidyTuesday.commit, /^[a-f0-9]{40}$/u);
});

test("loads zoo datasets through immutable fixtures and isolated clones", () => {
  for (const id of corpusDatasetIds("zoo")) {
    const fixture = zooFixtureRows(id);
    const first = loadZooDataset(id);
    const second = loadZooDataset(id);
    assert.equal(fixture.length > 0, true, id);
    assert.equal(Object.isFrozen(fixture), true, id);
    assert.notStrictEqual(first, fixture, id);
    assert.notStrictEqual(first, second, id);
    assert.deepEqual(first, second, id);
  }
});

test("coerces pinned CSV fields only through explicit schemas", () => {
  const definition = {
    id: "typed",
    missingTokens: ["", "NA"],
    fields: {
      value: { type: "quantitative" },
      optional: { type: "quantitative", nullable: true },
      enabled: { type: "boolean" },
      year: { type: "temporal-year" },
      duration: { type: "duration-hms" },
      category: { type: "nominal" }
    }
  };
  assert.deepEqual(parseTypedCsv(
    "value,optional,enabled,year,duration,category\n1.5,NA,TRUE,2024,01:02:03,001\n",
    definition
  ), [{
    value: 1.5,
    optional: null,
    enabled: true,
    year: "2024-01-01T00:00:00Z",
    duration: 3723,
    category: "001"
  }]);
  assert.throws(
    () => parseTypedCsv("value,optional,enabled,year,duration,category\nNaN,,TRUE,2024,01:00:00,x\n", definition),
    /must be finite/
  );
});

test("selects deterministic samples with endpoint and numeric extrema witnesses", () => {
  const rows = Array.from({ length: 30 }, (_, index) => ({
    id: index,
    value: index === 17 ? 1_000 : index === 9 ? -1_000 : index
  }));
  const selection = {
    mode: "stable-sample",
    count: 8,
    seed: "fixture-seed",
    witnessFields: ["value"]
  };
  const selected = selectStableRows(rows, selection);
  assert.equal(selected.length, 8);
  assert.deepEqual(selectStableRows(rows, selection), selected);
  assert.deepEqual(
    [0, 9, 17, 29].every(index => selected.includes(rows[index])),
    true
  );
});

test("keeps TidyTuesday URLs commit-pinned and reports optional local caches", () => {
  for (const id of corpusDatasetIds("tidytuesday")) {
    const definition = datasetDefinition(id);
    const url = tidyTuesdaySourceUrl(id);
    assert.equal(url.includes(DATASET_CORPUS.tidyTuesday.commit), true, id);
    assert.equal(url.endsWith(definition.path), true, id);
    const report = tidyTuesdayFixtureReport(id);
    assert.equal(report.id, id);
    assert.equal(typeof report.cached, "boolean");
    if (report.cached) {
      assert.equal(report.bytes, definition.bytes, id);
      assert.equal(report.sha256, definition.sha256, id);
    }
  }
});

test("rejects unknown or ambiguous dataset sync arguments before downloading", () => {
  const script = fileURLToPath(new URL(
    "../../scripts/sync-dataset-corpus.js",
    import.meta.url
  ));
  for (const arguments_ of [["--unknown"], ["--all", "tt-penguins"]]) {
    const result = spawnSync(process.execPath, [script, ...arguments_], {
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown dataset sync option|cannot be combined/);
  }
});

test("applies deterministic, non-mutating corpus mutations", () => {
  const rows = [{ id: "a", value: 1 }, { id: "b", value: 2 }, { id: "c", value: 3 }];
  assert.deepEqual(shuffleRows(rows, "same"), shuffleRows(rows, "same"));
  assert.equal(duplicateRows(rows, 2).length, 5);
  assert.deepEqual(injectMissing(rows, ["value"], { every: 2 }), [
    { id: "a", value: null },
    { id: "b", value: 2 },
    { id: "c", value: null }
  ]);
  assert.deepEqual(scaleNumericFields(rows, ["value"], 10), [
    { id: "a", value: 10 }, { id: "b", value: 20 }, { id: "c", value: 30 }
  ]);
  assert.deepEqual(renameFields(rows, { value: "measure" }), [
    { id: "a", measure: 1 }, { id: "b", measure: 2 }, { id: "c", measure: 3 }
  ]);
  assert.deepEqual(rows, [{ id: "a", value: 1 }, { id: "b", value: 2 }, { id: "c", value: 3 }]);
});
