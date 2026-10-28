import { annotateError } from "../core/diagnostics.js";
import { requireDataset } from "./datasets.js";

const rowKeys = new WeakMap();
function hasRowKey(dataset, key) {
  let keys = rowKeys.get(dataset);
  if (keys === undefined) { keys = new Set(dataset.rowKeys); rowKeys.set(dataset, keys); }
  return keys.has(key);
}

export function findStoredResource(program, kind, id) {
  return program.semanticSpec.resources?.find(resource => resource.kind === kind && resource.id === id);
}

export function requireStoredResource(program, ref) {
  const resource = findStoredResource(program, ref.kind, ref.id);
  if (resource === undefined) throw annotateError(new Error("Referenced resource does not exist."), {
    code: "missing-resource", resourceId: ref.id
  });
  if (ref.revision !== undefined && resource.revision !== ref.revision) throw annotateError(new Error("Resource reference is stale."), {
    code: "stale-result", resourceId: ref.id, expected: resource.revision, actual: ref.revision
  });
  return resource;
}

export function resolveInputReference(program, ref) {
  if (ref.kind !== "data") return requireStoredResource(program, ref);
  const dataset = requireDataset(program, ref.id);
  if (dataset.logicalId !== ref.logicalId || dataset.revision !== ref.revision) throw annotateError(new Error("Data input reference is stale."), {
    code: "stale-result", resourceId: ref.id, expected: dataset.revision, actual: ref.revision
  });
  return dataset;
}

export function dataInputReference(dataset) {
  return { kind: "data", id: dataset.id, logicalId: dataset.logicalId, revision: dataset.revision };
}

export function resolveRowReference(program, ref) {
  const dataset = resolveInputReference(program, { kind: "data", id: ref.data, logicalId: ref.logicalDataId, revision: ref.revision });
  if (!hasRowKey(dataset, ref.rowKey)) throw annotateError(new Error("Lineage input row no longer exists."), { code: "stale-result", resourceId: ref.data });
  return dataset;
}

export function resolveGraphicLineage(program, identity) {
  let scope = program;
  for (const namespace of JSON.parse(identity.key)[0]) {
    const children = (scope.compositionSpec?.children ?? []).filter(id => `${scope.compositionSpec.id}-${id}` === namespace);
    if (children.length !== 1 || scope.children[children[0]] === undefined) {
      throw annotateError(new Error("Graphic identity has an unknown child scope."), { code: "missing-resource" });
    }
    scope = scope.children[children[0]];
  }
  if (identity.lineage.kind === "resource") return requireStoredResource(scope, identity.lineage.resource);
  const { data, logicalDataId, revision, rowKeys: keys } = identity.lineage;
  const dataset = resolveInputReference(scope, { kind: "data", id: data, logicalId: logicalDataId, revision });
  if (keys.some(key => !hasRowKey(dataset, key))) throw annotateError(new Error("Graphic lineage input row no longer exists."), {
    code: "stale-result", resourceId: data
  });
  return dataset;
}
