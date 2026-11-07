import { createInferenceJob, validateInferenceJob, validateInferenceCompletion } from "../../grammar/graph/inferenceJob.js";
import { validatePreparedInferredResource } from "./inferredState.js";
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

export function inferredGraphJob({ program, data, candidate, definition }) {
  const model = resolveGraphCandidateModel(program, data, candidate, definition);
  return createInferenceJob({ inputs: [dataInputReference(data), ...(candidate === undefined ? [] : [{ kind: "graph", id: candidate.id, revision: candidate.revision }])],
    rows: data.values, definition, ...(candidate === undefined ? {} : { candidate: model,
      candidateLimits: { maxNodes: candidate.options.definition.maxNodes, maxEdges: candidate.options.definition.maxEdges },
      ...(Object.hasOwn(candidate.options.definition, "execution") ? { candidateExecution: candidate.options.definition.execution } : {}) }) });
}

export function completedInferredGraphResource({ program, id, revision = 0, data }, input, completion) {
  const job = validateInferenceJob(input), checked = validateInferenceCompletion(job, completion);
  const resource = cloneAndFreeze({ kind: "graph", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: job.inputs, options: { roles: { nodes: 0, edges: 0 }, definition: job.definition }, result: checked.result,
    provenance: { origin: "inferred", sourceRows: graphRowReferences(data, "node") } });
  return validatePreparedInferredResource(program, resource);
}
