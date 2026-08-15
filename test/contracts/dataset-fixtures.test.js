import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  selectStableEntries,
  loadTidyTuesdayDatasetEntries,
  loadTidyTuesdaySourceEntries,
  releaseTidyTuesdaySourceCache,
  tidyTuesdayFixtureEntries,
  tidyTuesdayFixtureReport,
  tidyTuesdaySourceEntries,
  tidyTuesdaySourceUrl
} from "../support/datasets/tidytuesday.js";
import {
  loadZooDataset,
  zooFixtureRows,
  zooGeneratorNames
} from "../support/datasets/zoo.js";
import {
  referenceStableSelectionIndices,
  stableSelectionIndexDigest
} from "../oracles/stable-sample-selection.js";

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
  assert.equal(corpusDatasetIds("tidytuesday").length, 50);
  assert.equal(corpusDatasetIds("zoo").length, 19);
  assert.equal(new Set(corpusDatasetIds()).size, 69);
  assert.deepEqual(
    [...zooGeneratorNames()].sort(),
    corpusDatasetIds("zoo")
      .map(id => datasetDefinition(id).generator)
      .sort()
  );
  assert.match(DATASET_CORPUS.tidyTuesday.commit, /^[a-f0-9]{40}$/u);
  assert.deepEqual(
    {
      datasets: DATASET_CORPUS.tidyTuesday.datasetCount,
      bytes: DATASET_CORPUS.tidyTuesday.totalBytes,
      rows: DATASET_CORPUS.tidyTuesday.totalRows,
      selectedRows: DATASET_CORPUS.tidyTuesday.selectedRows
    },
    { datasets: 50, bytes: 52_694_271, rows: 466_483, selectedRows: 54_877 }
  );
});

test("describes every real source with typed fields, roles, mappings, and provenance", () => {
  const definitions = corpusDatasetIds("tidytuesday").map(datasetDefinition);
  assert.equal(new Set(definitions.map(({ path }) => path)).size, 50);
  assert.equal(new Set(definitions.map(({ provenance }) => provenance.week)).size, 50);
  assert.equal(
    new Set(definitions.map(({ provenance }) => provenance.upstreamUrl)).size,
    50
  );
  assert.equal(
    new Set(definitions.map(({ provenance }) =>
      `${provenance.sourceName}\0${provenance.upstreamUrl}`
    )).size,
    50
  );
  for (const definition of definitions) {
    const fields = new Set(Object.keys(definition.fields));
    assert.equal(definition.blobUrl.includes(DATASET_CORPUS.tidyTuesday.commit), true);
    assert.equal(definition.provenance.readmeUrl.includes(
      DATASET_CORPUS.tidyTuesday.commit
    ), true);
    assert.match(definition.provenance.upstreamUrl, /^https?:\/\//u);
    assert.equal(definition.fieldRoles.measure.length > 0, true, definition.id);
    assert.equal(definition.fieldRoles.dimension.length > 0, true, definition.id);
    assert.equal(
      definition.fieldRoles.measure.every(field =>
        ["quantitative", "duration-hms"].includes(definition.fields[field].type)
      ),
      true,
      definition.id
    );
    assert.equal(
      definition.fieldRoles.dimension.every(field =>
        definition.fields[field].profile.distinct >= 2
      ),
      true,
      definition.id
    );
    assert.equal(
      definition.fieldRoles.temporal.every(field =>
        definition.fields[field].type.startsWith("temporal-")
      ),
      true,
      definition.id
    );
    assert.equal(
      definition.fieldRoles.weight.every(field =>
        ["quantitative", "duration-hms"].includes(definition.fields[field].type)
      ),
      true,
      definition.id
    );
    for (const roleFields of Object.values(definition.fieldRoles)) {
      assert.equal(roleFields.every(field => fields.has(field)), true, definition.id);
    }
    for (const mapping of definition.chartMappings) {
      assert.equal(fields.has(mapping.x), true, definition.id);
      assert.equal(fields.has(mapping.y), true, definition.id);
      assert.equal(
        definition.fieldRoles.measure.includes(mapping.y),
        true,
        definition.id
      );
      assert.equal(mapping.description.length > 20, true, definition.id);
    }
    assert.equal(
      new Set(definition.chartMappings.map(({ id }) => id)).size,
      definition.chartMappings.length,
      definition.id
    );
    assert.equal(definition.sourceProfile.fieldCount, fields.size, definition.id);
  }
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

test("normalizes only explicitly declared upstream CSV quirks", () => {
  const definition = {
    id: "quirky",
    csv: { lineEnding: "cr", headerAliases: { "": "source_row" } },
    fields: {
      source_row: { type: "quantitative" },
      value: { type: "quantitative" }
    }
  };
  assert.deepEqual(parseTypedCsv('"",value\r1,2\r2,3\r', definition), [
    { source_row: 1, value: 2 },
    { source_row: 2, value: 3 }
  ]);
  assert.throws(
    () => parseTypedCsv("source,value\n1,2\n", definition),
    /invalid empty-header alias/
  );
});

test("selects deterministic samples with endpoint and numeric extrema witnesses", () => {
  const rows = Array.from({ length: 30 }, (_, index) => ({
    id: index,
    value: index === 17 ? 1_000 : index === 9 ? -1_000 : index,
    category: index === 14 ? "rare" : index % 2 === 0 ? "even" : "odd"
  }));
  const selection = {
    mode: "stable-sample",
    count: 8,
    seed: "fixture-seed",
    witnessFields: ["value"],
    witnessDimensions: ["category"]
  };
  const selected = selectStableRows(rows, selection);
  const entries = selectStableEntries(rows, selection);
  assert.equal(selected.length, 8);
  assert.deepEqual(selectStableRows(rows, selection), selected);
  assert.deepEqual(
    [0, 9, 14, 17, 29].every(index => selected.includes(rows[index])),
    true
  );
  assert.deepEqual(entries.map(({ row }) => row), selected);
  assert.deepEqual(
    entries.map(({ sourceRowIndex }) => sourceRowIndex),
    entries.map(({ row }) => rows.indexOf(row))
  );
});

test("matches the independent full-sort stable-sample oracle", () => {
  const rows = Array.from({ length: 4_097 }, (_, index) => ({
    value: index === 117 || index === 311 ? -50 :
      index === 3_707 || index === 3_902 ? 50 : index % 97,
    secondary: index % 43 === 0 ? null : (index * 37) % 211,
    category: `group-${index % 23}`
  }));
  const selection = {
    mode: "stable-sample",
    count: 257,
    seed: "stable-selection-reference",
    witnessFields: ["value", "secondary"],
    witnessDimensions: ["category"]
  };
  const expected = referenceStableSelectionIndices(rows, selection);
  const actual = selectStableEntries(rows, selection)
    .map(({ sourceRowIndex }) => sourceRowIndex);
  assert.deepEqual(actual, expected);
  assert.equal(stableSelectionIndexDigest(actual), stableSelectionIndexDigest(expected));

  const witnessFilledSelection = {
    mode: "stable-sample",
    count: 4,
    seed: "witness-filled-selection",
    witnessFields: ["value"],
    witnessDimensions: []
  };
  const witnessFilledRows = [
    { value: 0 },
    { value: 4 },
    { value: -10 },
    { value: 2 },
    { value: 10 },
    { value: 1 }
  ];
  assert.deepEqual(
    selectStableEntries(witnessFilledRows, witnessFilledSelection)
      .map(({ sourceRowIndex }) => sourceRowIndex),
    [0, 2, 4, 5]
  );
});

test("preserves the pinned large-source stable-sample index digest", () => {
  const id = "tt-us-tornadoes";
  try {
    const indexes = tidyTuesdayFixtureEntries(id)
      .map(({ sourceRowIndex }) => sourceRowIndex);
    assert.equal(indexes.length, 1_024);
    assert.deepEqual(indexes.slice(0, 12), [
      0, 8, 40, 47, 104, 105, 218, 224, 366, 381, 431, 468
    ]);
    assert.deepEqual(indexes.slice(-12), [
      68_200, 68_252, 68_307, 68_312, 68_319, 68_453,
      68_454, 68_455, 68_468, 68_513, 68_553, 68_692
    ]);
    assert.equal(
      stableSelectionIndexDigest(indexes),
      "6f29658c90ffe1e4541af252ed494ae4907fec187f06f81019a1d860086478ab"
    );
  } finally {
    releaseTidyTuesdaySourceCache(id);
  }
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
      const entries = tidyTuesdayFixtureEntries(id);
      assert.equal(entries.length, definition.selectedRows, id);
      assert.equal(Object.isFrozen(entries), true, id);
      assert.equal(entries.every(({ sourceRowIndex }) =>
        Number.isInteger(sourceRowIndex) && sourceRowIndex >= 0 &&
        sourceRowIndex < definition.rows
      ), true, id);
      const first = loadTidyTuesdayDatasetEntries(id);
      const second = loadTidyTuesdayDatasetEntries(id);
      assert.notStrictEqual(first, entries, id);
      assert.notStrictEqual(first, second, id);
      assert.deepEqual(first, second, id);
      assert.equal(first[0].sourceRowIndex, entries[0].sourceRowIndex, id);
      assert.notStrictEqual(first[0].row, entries[0].row, id);
    }
    releaseTidyTuesdaySourceCache(id);
  }
});

test("exposes every verified source row with immutable original lineage", () => {
  const id = corpusDatasetIds("tidytuesday")
    .find(candidate => datasetDefinition(candidate).selection.mode === "stable-sample");
  const definition = datasetDefinition(id);
  const source = tidyTuesdaySourceEntries(id);
  const fixture = tidyTuesdayFixtureEntries(id);
  const first = loadTidyTuesdaySourceEntries(id);
  const second = loadTidyTuesdaySourceEntries(id);

  assert.equal(source.length, definition.rows);
  assert.equal(fixture.length, definition.selectedRows);
  assert.equal(source.length > fixture.length, true);
  assert.equal(Object.isFrozen(source), true);
  assert.equal(Object.isFrozen(source[0]), true);
  assert.equal(Object.isFrozen(source[0].row), true);
  assert.deepEqual(
    source.map(({ sourceRowIndex }) => sourceRowIndex),
    Array.from({ length: definition.rows }, (_, index) => index)
  );
  assert.notStrictEqual(first, source);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first[0].row, source[0].row);
  assert.deepEqual(first, second);

  releaseTidyTuesdaySourceCache(id);
  const reloaded = tidyTuesdaySourceEntries(id);
  assert.notStrictEqual(reloaded, source);
  assert.deepEqual(reloaded, source);
});

test("keeps optional raw caches outside git and the published package", () => {
  const gitignore = readFileSync(new URL("../../.gitignore", import.meta.url), "utf8");
  const packageJson = JSON.parse(readFileSync(
    new URL("../../package.json", import.meta.url),
    "utf8"
  ));
  assert.match(gitignore, /^\.artifacts\/$/mu);
  assert.equal(packageJson.files.some(file => file.startsWith("data/")), false);
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
