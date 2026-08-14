import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(
  new URL("../../../data/corpus/manifest.json", import.meta.url),
  "utf8"
));

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validateStringList(value, label) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every(item => typeof item === "string" && item.length > 0)
  ) {
    throw new TypeError(`${label} must contain non-empty strings.`);
  }
}

function validateManifest(value) {
  if (value?.version !== 1 || !Array.isArray(value.datasets)) {
    throw new Error("Dataset corpus manifest must use version 1.");
  }
  const ids = new Set();
  for (const dataset of value.datasets) {
    if (
      dataset === null ||
      typeof dataset !== "object" ||
      typeof dataset.id !== "string" ||
      dataset.id.length === 0 ||
      !["tidytuesday", "zoo"].includes(dataset.corpus)
    ) {
      throw new TypeError("Dataset corpus entries require an id and corpus.");
    }
    if (ids.has(dataset.id)) {
      throw new Error(`Dataset corpus repeats id "${dataset.id}".`);
    }
    ids.add(dataset.id);
    validateStringList(dataset.profiles, `${dataset.id} profiles`);
    validateStringList(dataset.chartFamilies, `${dataset.id} chartFamilies`);
    if (dataset.corpus === "zoo") {
      if (typeof dataset.generator !== "string" || dataset.generator.length === 0) {
        throw new TypeError(`${dataset.id} requires a zoo generator.`);
      }
      continue;
    }
    if (
      typeof dataset.path !== "string" ||
      !/^[a-zA-Z0-9_./-]+$/u.test(dataset.path) ||
      dataset.path.includes("..") ||
      !/^[a-f0-9]{64}$/u.test(dataset.sha256) ||
      !Number.isInteger(dataset.bytes) || dataset.bytes <= 0 ||
      !Number.isInteger(dataset.rows) || dataset.rows <= 0 ||
      dataset.fields === null || typeof dataset.fields !== "object"
    ) {
      throw new TypeError(`${dataset.id} has an invalid pinned source contract.`);
    }
  }
  return value;
}

export const DATASET_CORPUS = deepFreeze(validateManifest(manifest));

const byId = new Map(DATASET_CORPUS.datasets.map(dataset => [dataset.id, dataset]));

export function datasetDefinition(id) {
  const dataset = byId.get(id);
  if (dataset === undefined) throw new Error(`Unknown corpus dataset "${id}".`);
  return dataset;
}

export function corpusDatasetIds(corpus) {
  if (corpus !== undefined && !["tidytuesday", "zoo"].includes(corpus)) {
    throw new Error(`Unknown dataset corpus "${corpus}".`);
  }
  return Object.freeze(DATASET_CORPUS.datasets
    .filter(dataset => corpus === undefined || dataset.corpus === corpus)
    .map(dataset => dataset.id));
}
