import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { parseFashionTsneCsv } from "./fashion-tsne.js";
import { parseCsv } from "./csv.js";

const FIXTURES = Object.freeze({
  cars: Object.freeze({
    file: new URL("../../data/cars.json", import.meta.url),
    format: "json",
    rows: 406,
    bytes: 100492,
    sha256: "f686a53678b21f4231e2f6a5ba7ce5761d9d39204fccdea1caa29fb8c460e319"
  }),
  jobs: Object.freeze({
    file: new URL("../../data/jobs.json", import.meta.url),
    format: "json",
    rows: 7650,
    bytes: 936649,
    sha256: "bc9a798eba79dd166939d040c92641943a0b031955eb6fd897223a9cdab8a7e6"
  }),
  gapminder: Object.freeze({
    file: new URL("../../data/gapminder.json", import.meta.url),
    format: "json",
    rows: 682,
    bytes: 75201,
    sha256: "70630efd862153116c1518a098a5a3bc4ca8c9f037306f86fba282a2720909b9"
  }),
  nightingaleRose: Object.freeze({
    file: new URL("../../data/nightingale_rose.json", import.meta.url),
    format: "json",
    rows: 36,
    bytes: 2885,
    sha256: "ab332b25f7b26770f4fb1d782e774e9e7140c12b8af231da50643872d3c7f1b0"
  }),
  imdbSelected: Object.freeze({
    file: new URL("../../data/imdb_selected.json", import.meta.url),
    format: "json",
    rows: 8,
    bytes: 715,
    sha256: "756e1f343bb57cae20b423d2428f250b2fb6a765937f114dc90a257913c28e9f"
  }),
  fashionTsne: Object.freeze({
    file: new URL("../../data/fashion_mnist_tsne.csv", import.meta.url),
    format: "fashion-tsne-csv",
    rows: 498,
    bytes: 14955,
    sha256: "23a2f09eaa7c50b3ab8e5724c618ce5fc7a3eb9a7d19ec64b8e9fe3670713a02"
  }),
  imdbTop1000: Object.freeze({
    file: new URL("../../data/imdb_top_1000.csv", import.meta.url),
    format: "csv-lines",
    rows: 1000,
    bytes: 437095,
    sha256: "dd601d4babad337c8e84ccf6a08416b092d5592148cc2e4020c260d816be5c49"
  })
});

const byteCache = new Map();
const rowCache = new Map();

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function fixture(id) {
  const definition = FIXTURES[id];
  if (definition === undefined) throw new Error(`Unknown test dataset "${id}".`);
  return definition;
}

function bytes(id) {
  if (!byteCache.has(id)) byteCache.set(id, readFileSync(fixture(id).file));
  return byteCache.get(id);
}

function parseRows(id) {
  const definition = fixture(id);
  const source = bytes(id).toString("utf8");
  if (definition.format === "json") return JSON.parse(source);
  if (definition.format === "fashion-tsne-csv") {
    return parseFashionTsneCsv(source);
  }
  if (definition.format === "csv-lines") return parseCsv(source);
  throw new Error(`Test dataset "${id}" does not define a row parser.`);
}

export function fixtureRows(id) {
  if (!rowCache.has(id)) rowCache.set(id, deepFreeze(parseRows(id)));
  return rowCache.get(id);
}

export function loadDataset(id) {
  return structuredClone(fixtureRows(id));
}

export function loadedDatasetIds() {
  return Object.freeze([...byteCache.keys()]);
}

export function datasetFixtureReport() {
  return Object.freeze(Object.entries(FIXTURES).map(([id, definition]) => {
    const source = bytes(id);
    const rows = definition.format === "csv-lines"
      ? source.toString("utf8").trimEnd().split(/\r?\n/).length - 1
      : fixtureRows(id).length;
    return Object.freeze({
      id,
      format: definition.format,
      rows,
      bytes: source.length,
      sha256: createHash("sha256").update(source).digest("hex"),
      expected: Object.freeze({
        rows: definition.rows,
        bytes: definition.bytes,
        sha256: definition.sha256
      })
    });
  }));
}

export function loadCars() {
  return loadDataset("cars");
}

export function loadJobs() {
  return loadDataset("jobs");
}

export function loadGapminder() {
  return loadDataset("gapminder");
}

export function loadNightingaleRose() {
  return loadDataset("nightingaleRose");
}

export function loadFashionTsne() {
  return loadDataset("fashionTsne");
}

export function loadImdbTop1000() {
  return loadDataset("imdbTop1000");
}

export function loadImdbSelected() {
  return loadDataset("imdbSelected");
}
