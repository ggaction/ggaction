import { renderToSVG } from "../../src/renderers/svg.js";
import assert from "node:assert/strict";

const datasetIdentity = new Set(["logicalId", "revision", "allocationId", "rowKeys", "nextGeneratedKey", "lineage"]);
const dataReferenceKeys = new Set(["kind", "id", "logicalId", "revision"]);

function isDataset(value) {
  return typeof value?.id === "string" &&
    (Object.hasOwn(value, "values") || Object.hasOwn(value, "transform"));
}

function datasetReferenceKey(value) {
  return JSON.stringify([value.id, value.revision, value.logicalId]);
}

function collectDatasetReferences(value, references = new Set()) {
  if (value === null || typeof value !== "object" || value instanceof Date) return references;
  if (isDataset(value)) {
    if (typeof value.logicalId === "string" && Number.isSafeInteger(value.revision)) {
      references.add(datasetReferenceKey(value));
    }
    return references;
  }
  for (const child of Object.values(value)) collectDatasetReferences(child, references);
  return references;
}

// Independently authored programs have distinct allocation namespaces. Compare
// their chart meaning and exact concrete draw state here; identity lifecycle has
// separate assertions that deliberately retain all of these fields.
export function withoutAllocatedIdentity(value, index) {
  return normalizeAllocatedIdentity(value, index, collectDatasetReferences(value));
}

function normalizeAllocatedIdentity(value, index, references) {
  if (Array.isArray(value)) return value.map((child, childIndex) =>
    normalizeAllocatedIdentity(child, childIndex, references));
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  const dataset = isDataset(value);
  const dataReference = value.kind === "data" &&
    Object.keys(value).length === dataReferenceKeys.size &&
    Object.keys(value).every(key => dataReferenceKeys.has(key)) &&
    references.has(datasetReferenceKey(value));
  const item = typeof value.id === "string" && value.properties !== undefined;
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    if (dataset && (datasetIdentity.has(key) || key === "keySpec" && child.mode === "generated") || item && key === "identity") return [];
    // Normalize only references proven to point at a dataset in this comparison.
    // Orphaned or mismatched references retain their identity and remain unequal.
    if (dataReference && key === "logicalId") return [];
    if (item && key === "id" && Number.isInteger(index)) return [[key, child.replace(/:[a-f0-9]{64}$/, `:${index}`)]];
    return [[key, normalizeAllocatedIdentity(child, undefined, references)]];
  }));
}

export function assertEquivalentMeaning(actual, expected, message) {
  assert.deepEqual(withoutAllocatedIdentity(actual), withoutAllocatedIdentity(expected), message);
}

export function selectedItemPositions(resolved) {
  return resolved.keys.map(key => resolved.items.findIndex(item => item.key === key));
}

export function comparableSVG(program) {
  return renderToSVG({ graphicSpec: withoutAllocatedIdentity(program.graphicSpec) });
}
