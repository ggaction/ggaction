import { graphRecomputeOwners } from "../../selectors/graphFilters.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { INFERRED_GRAPH_FIELDS } from "../../grammar/graph/input.js";
import { findStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { resolveGraphResource, resolveGraphSourceData } from "../../selectors/graphs.js";

// Ordinary actions and asynchronous preparation resolve the same native request.
export function normalizeInferenceRequest(program, input, editing) {
  const args = Object.assign(Object.create(null), ownRecord(input, "Graph inference request"));
  rejectUnknownProperties(args, editing ? ["target", "data", "candidateGraph", "definition"]
    : ["id", "data", "candidateGraph", ...INFERRED_GRAPH_FIELDS], "graph inference request");
  if (Object.values(args).some(value => value === undefined)) throw new TypeError("Graph inference arguments cannot contain undefined.");
  if (!editing) {
    const { id, data, candidateGraph, ...definition } = args;
    validateUserId(id, "Graph id");
    if (findStoredResource(program, "graph", id)) throw annotateError(new Error("Graph already exists."), { code: "duplicate-id", resourceId: id });
    return { program, id, revision: 0, data: resolveGraphSourceData(program, data),
      candidate: candidateGraph === undefined ? undefined : resolveGraphResource(program, candidateGraph), definition };
  }
  const previous = resolveGraphResource(program, args.target, "inferred"), patch = Object.hasOwn(args, "definition") ? args.definition : {};
  ownRecord(patch, "Graph inference definition patch");
  if (!Object.keys(patch).length && !Object.hasOwn(args, "data") && !Object.hasOwn(args, "candidateGraph")) throw new TypeError("Graph inference edits require a nonempty patch.");
  if (previous.revision === Number.MAX_SAFE_INTEGER) throw new RangeError("Graph inference revision limit exceeded.");
  for (const owner of graphRecomputeOwners(program, previous.id)) {
    const view = program.markConfigs[owner.id].graphPlot.view.recompute;
    if ((args.data !== undefined && args.data !== view.dataset) ||
        (Object.hasOwn(patch, "nodeKey") && canonicalJSON(patch.nodeKey) !== canonicalJSON(previous.options.definition.nodeKey))) {
      throw new TypeError("Remove the graph recompute filter before changing its source or nodeKey.");
    }
  }
  const data = args.data === undefined ? resolveInputReference(program, previous.inputs[0]) : resolveGraphSourceData(program, args.data);
  const candidate = args.candidateGraph === null ? undefined : args.candidateGraph === undefined
    ? previous.inputs.length === 2 ? resolveInputReference(program, previous.inputs[1]) : undefined : resolveGraphResource(program, args.candidateGraph);
  const retained = Object.hasOwn(patch, "rule") && patch.rule !== previous.options.definition.rule
    ? Object.fromEntries(["nodeKey", "attributes", "maxNodes", "maxEdges", "execution"].filter(key => Object.hasOwn(previous.options.definition, key)).map(key => [key, previous.options.definition[key]])) : previous.options.definition;
  return { program, id: previous.id, revision: previous.revision + 1, data, candidate, definition: { ...retained, ...patch } };
}
