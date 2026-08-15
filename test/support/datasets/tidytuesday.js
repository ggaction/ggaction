import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { datasetDefinition, DATASET_CORPUS } from "./catalog.js";
import { parseTypedCsv } from "./csv.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const cacheRoot = path.resolve(
  repositoryRoot,
  DATASET_CORPUS.tidyTuesday.cacheDirectory
);
const fixtureCache = new Map();
const fixtureEntryCache = new Map();
const sourceCache = new Map();
const sourceEntryCache = new Map();

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireTidyTuesdayDefinition(id) {
  const definition = datasetDefinition(id);
  if (definition.corpus !== "tidytuesday") {
    throw new Error(`Dataset "${id}" is not part of the TidyTuesday corpus.`);
  }
  return definition;
}

function stableRank(seed, index) {
  return createHash("sha256")
    .update(seed)
    .update("\0")
    .update(String(index))
    .digest("hex");
}

function witnessIndices(rows, fields, dimensions = []) {
  const indices = new Set([0, rows.length - 1]);
  for (const field of fields) {
    const finite = rows
      .map((row, index) => ({ index, value: row[field] }))
      .filter(entry => Number.isFinite(entry.value));
    if (finite.length === 0) continue;
    finite.sort((left, right) => left.value - right.value || left.index - right.index);
    indices.add(finite[0].index);
    indices.add(finite[finite.length - 1].index);
  }
  for (const field of dimensions) {
    const firstByValue = new Map();
    for (const [index, row] of rows.entries()) {
      const value = row[field];
      if (value !== null && !firstByValue.has(value)) firstByValue.set(value, index);
    }
    for (const index of firstByValue.values()) indices.add(index);
  }
  return indices;
}

function stableSelectionIndices(rows, selection) {
  if (selection?.mode === "all") return rows.map((_, index) => index);
  if (
    selection?.mode !== "stable-sample" ||
    !Number.isInteger(selection.count) || selection.count <= 0 ||
    typeof selection.seed !== "string" || selection.seed.length === 0 ||
    !Array.isArray(selection.witnessFields) ||
    !Array.isArray(selection.witnessDimensions ?? [])
  ) {
    throw new TypeError("TidyTuesday selection contract is invalid.");
  }
  if (rows.length <= selection.count) return rows.map((_, index) => index);

  const selected = witnessIndices(
    rows,
    selection.witnessFields,
    selection.witnessDimensions
  );
  if (selected.size > selection.count) {
    throw new RangeError(
      "TidyTuesday stable-sample count cannot hold every required witness row."
    );
  }
  const candidates = rows
    .map((_, index) => index)
    .filter(index => !selected.has(index))
    .map(index => ({ index, rank: stableRank(selection.seed, index) }))
    .sort((left, right) => left.rank.localeCompare(right.rank) || left.index - right.index);
  for (const { index } of candidates) {
    if (selected.size >= selection.count) break;
    selected.add(index);
  }
  return [...selected].sort((left, right) => left - right);
}

export function selectStableEntries(rows, selection) {
  return stableSelectionIndices(rows, selection).map(sourceRowIndex => Object.freeze({
    row: rows[sourceRowIndex],
    sourceRowIndex
  }));
}

export function selectStableRows(rows, selection) {
  if (selection?.mode === "all") return rows;
  return selectStableEntries(rows, selection).map(({ row }) => row);
}

export function tidyTuesdayCachePath(id) {
  requireTidyTuesdayDefinition(id);
  return path.join(cacheRoot, `${id}.csv`);
}

export function tidyTuesdaySourceUrl(id) {
  const definition = requireTidyTuesdayDefinition(id);
  const repository = DATASET_CORPUS.tidyTuesday.repository.replace(/\/$/u, "");
  const slug = repository.replace(/^https:\/\/github\.com\//u, "");
  return `https://raw.githubusercontent.com/${slug}/${DATASET_CORPUS.tidyTuesday.commit}/${definition.path}`;
}

export function verifyTidyTuesdaySource(id, source) {
  const definition = requireTidyTuesdayDefinition(id);
  if (typeof source !== "string") {
    throw new TypeError(`Dataset "${id}" source must be a string.`);
  }
  const report = Object.freeze({
    id,
    bytes: Buffer.byteLength(source),
    sha256: createHash("sha256").update(source).digest("hex")
  });
  if (report.bytes !== definition.bytes || report.sha256 !== definition.sha256) {
    throw new Error(
      `Dataset "${id}" does not match its pinned byte and SHA-256 contract.`
    );
  }
  const rows = parseTypedCsv(source, definition);
  if (rows.length !== definition.rows) {
    throw new Error(
      `Dataset "${id}" has ${rows.length} rows; expected ${definition.rows}.`
    );
  }
  const selected = selectStableEntries(rows, definition.selection);
  if (selected.length !== definition.selectedRows) {
    throw new Error(
      `Dataset "${id}" selects ${selected.length} rows; ` +
      `expected ${definition.selectedRows}.`
    );
  }
  return Object.freeze({ report, rows: deepFreeze(rows) });
}

export function tidyTuesdayFixtureReport(id) {
  const sourcePath = tidyTuesdayCachePath(id);
  if (!existsSync(sourcePath)) {
    return Object.freeze({ id, cached: false, path: sourcePath });
  }
  const { report } = verifyTidyTuesdaySource(id, readFileSync(sourcePath, "utf8"));
  return Object.freeze({ ...report, cached: true, path: sourcePath });
}

export function tidyTuesdayCached(id) {
  return existsSync(tidyTuesdayCachePath(id));
}

function cacheTidyTuesdaySource(id) {
  if (sourceCache.has(id)) return;
  const sourcePath = tidyTuesdayCachePath(id);
  if (!existsSync(sourcePath)) {
    throw new Error(
      `Dataset "${id}" is not cached. Run npm run datasets:sync first.`
    );
  }
  const { rows } = verifyTidyTuesdaySource(id, readFileSync(sourcePath, "utf8"));
  sourceCache.set(id, rows);
  sourceEntryCache.set(id, deepFreeze(rows.map((row, sourceRowIndex) => ({
    row,
    sourceRowIndex
  }))));
}

export function tidyTuesdaySourceRows(id) {
  cacheTidyTuesdaySource(id);
  return sourceCache.get(id);
}

export function tidyTuesdaySourceEntries(id) {
  cacheTidyTuesdaySource(id);
  return sourceEntryCache.get(id);
}

export function releaseTidyTuesdaySourceCache(id) {
  requireTidyTuesdayDefinition(id);
  sourceCache.delete(id);
  sourceEntryCache.delete(id);
}

export function tidyTuesdayFixtureRows(id) {
  if (!fixtureCache.has(id)) {
    const definition = requireTidyTuesdayDefinition(id);
    const rows = tidyTuesdaySourceRows(id);
    const entries = deepFreeze(selectStableEntries(rows, definition.selection));
    fixtureEntryCache.set(id, entries);
    fixtureCache.set(id, deepFreeze(entries.map(({ row }) => row)));
  }
  return fixtureCache.get(id);
}

export function tidyTuesdayFixtureEntries(id) {
  tidyTuesdayFixtureRows(id);
  return fixtureEntryCache.get(id);
}

export function loadTidyTuesdayDataset(id) {
  return structuredClone(tidyTuesdayFixtureRows(id));
}

export function loadTidyTuesdayDatasetEntries(id) {
  return structuredClone(tidyTuesdayFixtureEntries(id));
}

export function loadTidyTuesdaySourceEntries(id) {
  return structuredClone(tidyTuesdaySourceEntries(id));
}
