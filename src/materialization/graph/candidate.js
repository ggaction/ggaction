import { subsetGraphCandidate } from "../../grammar/graph/candidateSubset.js";
import { requireMaterializedDataset } from "../../selectors/datasets.js";

export function resolveGraphCandidateModel(program, data, candidate, definition) {
  if (candidate === undefined) return undefined;
  if (data.transform?.[0]?.type !== "graphSubset") return candidate.result.model;
  return subsetGraphCandidate(candidate.result.model, requireMaterializedDataset(program, data.source).values,
    data.values, definition.nodeKey, { maxNodes: candidate.options.definition.maxNodes, maxEdges: candidate.options.definition.maxEdges }, Object.hasOwn(candidate.options.definition, "execution") ? candidate.options.definition.execution : undefined);
}
