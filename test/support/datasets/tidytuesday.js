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

function witnessIndices(rows, fields) {
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
  return indices;
}

export function selectStableRows(rows, selection) {
  if (selection?.mode === "all") return rows;
  if (
    selection?.mode !== "stable-sample" ||
    !Number.isInteger(selection.count) || selection.count <= 0 ||
    typeof selection.seed !== "string" || selection.seed.length === 0 ||
    !Array.isArray(selection.witnessFields)
  ) {
    throw new TypeError("TidyTuesday selection contract is invalid.");
  }
  if (rows.length <= selection.count) return rows;

  const selected = witnessIndices(rows, selection.witnessFields);
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
  return [...selected]
    .sort((left, right) => left - right)
    .map(index => rows[index]);
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

export function tidyTuesdayFixtureRows(id) {
  if (!fixtureCache.has(id)) {
    const sourcePath = tidyTuesdayCachePath(id);
    if (!existsSync(sourcePath)) {
      throw new Error(
        `Dataset "${id}" is not cached. Run npm run datasets:sync first.`
      );
    }
    const definition = requireTidyTuesdayDefinition(id);
    const { rows } = verifyTidyTuesdaySource(id, readFileSync(sourcePath, "utf8"));
    fixtureCache.set(id, deepFreeze(selectStableRows(rows, definition.selection)));
  }
  return fixtureCache.get(id);
}

export function loadTidyTuesdayDataset(id) {
  return structuredClone(tidyTuesdayFixtureRows(id));
}
