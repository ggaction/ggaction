import { renderToSVG } from "../../src/renderers/svg.js";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const datasetIdentity = new Set(["logicalId", "revision", "allocationId", "rowKeys", "nextGeneratedKey", "lineage"]);
const dataReferenceKeys = new Set(["kind", "id", "logicalId", "revision"]);

function isDataset(value) {
  return typeof value?.id === "string" &&
    (Object.hasOwn(value, "values") || Object.hasOwn(value, "transform"));
}

function datasetReferenceKey(value) {
  return JSON.stringify([value.id, value.revision, value.logicalId]);
}

function collectDatasetReferences(value, references = new Map()) {
  if (value === null || typeof value !== "object" || value instanceof Date) return references;
  if (isDataset(value)) {
    if (typeof value.logicalId === "string" && Number.isSafeInteger(value.revision)) {
      references.set(datasetReferenceKey(value), value);
    }
    return references;
  }
  for (const child of Object.values(value)) collectDatasetReferences(child, references);
  return references;
}

function normalizeObservedOccurrences(value, references) {
  if (value.kind !== "graph" || value.provenance?.origin !== "observed" ||
      !value.options?.definition || Object.hasOwn(value.options.definition, "edgeKey")) return value;
  const input = value.inputs?.[value.options.roles?.edges];
  const dataset = input?.kind === "data" && references.get(datasetReferenceKey(input));
  const model = value.result?.model;
  if (!dataset || !Array.isArray(model?.edges) || !Array.isArray(model.adjacency)) return value;
  const keys = new Map();
  for (const edge of model.edges) {
    const row = edge.sourceRows?.length === 1 ? edge.sourceRows[0] : undefined;
    if (!Number.isInteger(row) || row < 0 || typeof dataset.rowKeys?.[row] !== "string") continue;
    const occurrence = JSON.stringify([dataset.logicalId, dataset.rowKeys[row]]);
    const allocated = JSON.stringify(["observed-occurrence", occurrence]);
    if (edge.key !== allocated) continue;
    const stableRow = dataset.keySpec?.mode === "generated" ? `row:${row}` : dataset.rowKeys[row];
    keys.set(allocated, JSON.stringify(["observed-occurrence", JSON.stringify([dataset.id, stableRow])]));
  }
  if (keys.size === 0) return value;
  const normalizeKey = key => keys.get(key) ?? key;
  return { ...value, result: { ...value.result, model: { ...model,
    edges: model.edges.map(edge => ({ ...edge, key: normalizeKey(edge.key) })),
    adjacency: model.adjacency.map(node => ({ ...node,
      incoming: Array.isArray(node.incoming) ? node.incoming.map(normalizeKey) : node.incoming,
      outgoing: Array.isArray(node.outgoing) ? node.outgoing.map(normalizeKey) : node.outgoing
    }))
  } } };
}

function normalizeGeometryIdentity(value) {
  if (value.kind !== "geometry" || value.options?.method !== "geo" || !value.result?.identity) return value;
  const { logicalId, allocationId, ...identity } = value.result.identity;
  if (identity.keySpec?.mode === "generated" && Array.isArray(identity.rowKeys)) {
    const namespaces = new Map();
    identity.rowKeys = identity.rowKeys.map(key => {
      let decoded;
      try { decoded = JSON.parse(key); } catch { return key; }
      if (!Array.isArray(decoded) || decoded.length !== 3 || decoded[0] !== "generated" ||
          typeof decoded[1] !== "string" || !decoded[1] || !Number.isSafeInteger(decoded[2]) ||
          decoded[2] < 0 || decoded[2] >= identity.nextGeneratedKey || JSON.stringify(decoded) !== key) return key;
      if (!namespaces.has(decoded[1])) namespaces.set(decoded[1], namespaces.size);
      return JSON.stringify(["generated", `allocation:${namespaces.get(decoded[1])}`, decoded[2]]);
    });
  }
  return { ...value, result: { ...value.result, identity } };
}

// Independently authored programs have distinct allocation namespaces. Compare
// their chart meaning and exact concrete draw state here; identity lifecycle has
// separate assertions that deliberately retain all of these fields.
export function withoutAllocatedIdentity(value, index) {
  return normalizeAllocatedIdentity(value, index, collectDatasetReferences(value));
}

function normalizeTableCellCollections(value) {
  if (!value.objects || !Array.isArray(value.order)) return value;
  const hash = text => createHash("sha256").update(text).digest("hex"), ids = new Map(), targets = new Set();
  for (const [owner, parent] of Object.entries(value.objects)) for (const id of parent.children ?? []) {
    const cell = value.objects[id], identity = cell?.items?.[0]?.identity;
    if (cell?.type !== "collection" || !identity || !cell.items.every(item => item.identity?.key === identity.key)) continue;
    let key, token;
    try { key = JSON.parse(identity.key); token = JSON.parse(key[3][1]); } catch { continue; }
    const localKey = Array.isArray(key[0]) ? JSON.stringify([[], ...key.slice(1)]) : identity.key;
    if (![identity.key, localKey].some(key => id === `${owner}-cell-${hash(key)}`)) continue;
    if (key[2] !== "item" || token[0] !== "array" || token[1]?.[0] !== "table-cell" ||
        token[1].length !== 4 || !["header", "body", "footer"].includes(token[1][1])) continue;
    const meaning = [...token[1]];
    if (typeof meaning[2] === "string") {
      try {
        const row = JSON.parse(meaning[2]);
        if (row[0] === "generated" && row.length === 3 && typeof row[1] === "string" && row[1] && Number.isSafeInteger(row[2]) && row[2] >= 0) {
          meaning[2] = JSON.stringify(["generated", "allocation", row[2]]);
        }
      } catch { continue; }
    }
    const stable = `${owner}-cell-${hash(JSON.stringify([identity.lineage?.data, meaning]))}`;
    if (Object.hasOwn(value.objects, stable) && stable !== id) continue;
    if (targets.has(stable)) return value;
    targets.add(stable);
    ids.set(id, stable);
  }
  if (!ids.size) return value;
  return { ...value, order: value.order.map(id => ids.get(id) ?? id), objects: Object.fromEntries(Object.entries(value.objects).map(([id, object]) => [ids.get(id) ?? id, {
    ...object, ...(object.children ? { children: object.children.map(child => ids.get(child) ?? child) } : {}),
    ...(ids.has(id) ? { items: object.items.map(item => ({ ...item, id: item.id.replace(id, ids.get(id)) })) } : {})
  }])) };
}

function normalizeAllocatedIdentity(value, index, references) {
  if (Array.isArray(value)) return value.map((child, childIndex) =>
    normalizeAllocatedIdentity(child, childIndex, references));
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  value = normalizeTableCellCollections(normalizeGeometryIdentity(normalizeObservedOccurrences(value, references)));
  const dataset = isDataset(value);
  const dataReference = value.kind === "data" &&
    Object.keys(value).length === dataReferenceKeys.size &&
    Object.keys(value).every(key => dataReferenceKeys.has(key)) &&
    references.has(datasetReferenceKey(value));
  const rowDataset = references.get(datasetReferenceKey({ id: value.data, logicalId: value.logicalDataId, revision: value.revision }));
  const rowIndex = rowDataset?.rowKeys?.indexOf(value.rowKey) ?? -1;
  const rowReference = typeof value.rowKey === "string" && typeof value.role === "string" && rowIndex >= 0;
  const item = typeof value.id === "string" && value.properties !== undefined;
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    if (dataset && (datasetIdentity.has(key) || key === "keySpec" && child.mode === "generated") || item && key === "identity") return [];
    // Normalize only references proven to point at a dataset in this comparison.
    // Orphaned or mismatched references retain their identity and remain unequal.
    if (dataReference && key === "logicalId") return [];
    if (rowReference && key === "logicalDataId") return [];
    if (rowReference && key === "rowKey" && rowDataset.keySpec?.mode === "generated") return [[key, `row:${rowIndex}`]];
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
