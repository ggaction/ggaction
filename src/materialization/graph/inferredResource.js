import { cloneAndFreeze } from "../../core/immutable.js";
import { resolveInferredGraphInput } from "../../grammar/graph/input.js";
import { dataInputReference } from "../../selectors/resources.js";
import { graphRowReferences } from "./resources.js";

export function createInferredGraphResource({ id, revision = 0, data, candidate, definition }) {
  const resolved = resolveInferredGraphInput(data.values, definition, candidate?.result.model);
  const { edges: _edges, preparation, ...diagnostics } = resolved.inference;
  if (preparation !== undefined) {
    const { vectors: _vectors, ...retained } = preparation;
    diagnostics.preparation = retained;
  }
  return cloneAndFreeze({ kind: "graph", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: [dataInputReference(data), ...(candidate === undefined ? [] : [{ kind: "graph", id: candidate.id, revision: candidate.revision }])],
    options: { roles: { nodes: 0, edges: 0 }, definition: resolved.options },
    result: { model: resolved.model, diagnostics },
    provenance: { origin: "inferred", sourceRows: graphRowReferences(data, "node") } });
}
