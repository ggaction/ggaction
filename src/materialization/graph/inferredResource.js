import { resolvedInferenceResult } from "../../grammar/graph/inferenceResult.js";
import { resolveGraphCandidateModel } from "./candidate.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { resolveInferredGraphInput } from "../../grammar/graph/input.js";
import { dataInputReference } from "../../selectors/resources.js";
import { graphRowReferences } from "./resources.js";

export function createInferredGraphResource({ id, revision = 0, data, candidate, definition, program }) {
  const resolved = resolveInferredGraphInput(data.values, definition, resolveGraphCandidateModel(program, data, candidate, definition),
    candidate === undefined ? undefined : { maxNodes: candidate.options.definition.maxNodes, maxEdges: candidate.options.definition.maxEdges }, candidate !== undefined && Object.hasOwn(candidate.options.definition, "execution") ? candidate.options.definition.execution : undefined);
  return cloneAndFreeze({ kind: "graph", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: [dataInputReference(data), ...(candidate === undefined ? [] : [{ kind: "graph", id: candidate.id, revision: candidate.revision }])],
    options: { roles: { nodes: 0, edges: 0 }, definition: resolved.options },
    result: resolvedInferenceResult(resolved),
    provenance: { origin: "inferred", sourceRows: graphRowReferences(data, "node") } });
}
