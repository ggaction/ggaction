import { cloneAndFreeze } from "../../core/immutable.js";
import { resolveObservedGraphInput } from "../../grammar/graph/input.js";
import { dataInputReference } from "../../selectors/resources.js";

export function graphOccurrenceKeys(dataset) {
  return dataset.rowKeys.map(key => JSON.stringify([dataset.logicalId, key]));
}

export function graphRowReferences(dataset, role) {
  return dataset.rowKeys.map(rowKey => ({ data: dataset.id, logicalDataId: dataset.logicalId,
    revision: dataset.revision, rowKey, role }));
}

export function createObservedGraphResource({ id, revision = 0, nodes, edges, definition }) {
  const resolved = resolveObservedGraphInput(nodes.values, edges.values, definition,
    Object.hasOwn(definition, "edgeKey") ? undefined : graphOccurrenceKeys(edges));
  const inputs = [dataInputReference(nodes)];
  if (edges.id !== nodes.id) inputs.push(dataInputReference(edges));
  return cloneAndFreeze({ kind: "graph", id, revision, algorithmVersion: "1", ownership: { mode: "authored" }, inputs,
    options: { roles: { nodes: 0, edges: inputs.length - 1 }, definition: resolved.options },
    result: { model: resolved.model, diagnostics: null },
    provenance: { origin: "observed", sourceRows: [...graphRowReferences(nodes, "node"), ...graphRowReferences(edges, "edge")] } });
}
