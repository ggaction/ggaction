import { graphRecomputeOwners } from "../../selectors/graphFilters.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { ownRecord } from "../../core/ownData.js";
import { INFERRED_GRAPH_FIELDS } from "../../grammar/graph/input.js";
import { createInferredGraphResource } from "../../materialization/graph/inferredResource.js";
import { findStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { resolveGraphResource, resolveGraphSourceData } from "../../selectors/graphs.js";
import { writeGraphResource } from "./layouts.js";

export const createInferredGraphData = /* @__PURE__ */ closedAction(
  { op: "createInferredGraphData", description: "Infer stable graph relationships from explicit data rules." },
  ["id", "data", "candidateGraph", ...INFERRED_GRAPH_FIELDS], function (args = {}) {
    const { id, data, candidateGraph, ...definition } = args;
    validateUserId(id, "Graph id");
    if (Object.values(args).some(value => value === undefined)) throw new TypeError("Graph inference arguments cannot contain undefined.");
    if (findStoredResource(this, "graph", id)) throw annotateError(new Error("Graph already exists."), { code: "duplicate-id", resourceId: id });
    const candidate = candidateGraph === undefined ? undefined : resolveGraphResource(this, candidateGraph);
    const resource = createInferredGraphResource({ program: this, id, data: resolveGraphSourceData(this, data), candidate, definition });
    return this.editSemantic({ property: `resource[graph:${id}]`, value: resource });
  });

export const editInferredGraphData = /* @__PURE__ */ closedAction(
  { op: "editInferredGraphData", description: "Revise inferred topology and refresh its dependent layouts." },
  ["target", "data", "candidateGraph", "definition"], function (args = {}) {
    const previous = resolveGraphResource(this, args.target, "inferred"), patch = Object.hasOwn(args, "definition") ? args.definition : {};
    ownRecord(patch, "Graph inference definition patch");
    if (Object.values(args).some(value => value === undefined)) throw new TypeError("Graph inference edits cannot contain undefined.");
    if (!Object.keys(patch).length && !Object.hasOwn(args, "data") && !Object.hasOwn(args, "candidateGraph")) throw new TypeError("Graph inference edits require a nonempty patch.");
    for (const owner of graphRecomputeOwners(this, previous.id)) {
      const view = this.markConfigs[owner.id].graphPlot.view.recompute;
      if ((args.data !== undefined && args.data !== view.dataset) ||
          (Object.hasOwn(patch, "nodeKey") && canonicalJSON(patch.nodeKey) !== canonicalJSON(previous.options.definition.nodeKey))) {
        throw new TypeError("Remove the graph recompute filter before changing its source or nodeKey.");
      }
    }
    const data = args.data === undefined ? resolveInputReference(this, previous.inputs[0]) : resolveGraphSourceData(this, args.data);
    const candidate = args.candidateGraph === null ? undefined : args.candidateGraph === undefined
      ? previous.inputs.length === 2 ? resolveInputReference(this, previous.inputs[1]) : undefined : resolveGraphResource(this, args.candidateGraph);
    const retained = Object.hasOwn(patch, "rule") && patch.rule !== previous.options.definition.rule
      ? Object.fromEntries(["nodeKey", "attributes", "maxNodes", "maxEdges"].map(key => [key, previous.options.definition[key]])) : previous.options.definition;
    const resource = createInferredGraphResource({ program: this, id: previous.id, revision: previous.revision + 1, data, candidate, definition: { ...retained, ...patch } });
    return writeGraphResource(this, resource);
  });
