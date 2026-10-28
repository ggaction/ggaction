import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { ownRecord } from "../../core/ownData.js";
import { OBSERVED_GRAPH_FIELDS } from "../../grammar/graph/input.js";
import { createObservedGraphResource } from "../../materialization/graph/resources.js";
import { findStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { requireMaterializedDataset } from "../../selectors/datasets.js";
import { resolveGraphResource } from "../../selectors/graphs.js";
import { layoutGraph, writeGraphResource } from "./layouts.js";

export const createGraphData = /* @__PURE__ */ closedAction(
  { op: "createGraphData", description: "Create a graph from observed node and edge tables." }, ["id", "nodes", "edges", ...OBSERVED_GRAPH_FIELDS], function (args = {}) {
    const { id, nodes, edges, ...definition } = args;
    validateUserId(id, "Graph id");
    if (findStoredResource(this, "graph", id) !== undefined) throw annotateError(new Error("Graph already exists."), { code: "duplicate-id", resourceId: id });
    validateUserId(nodes, "Graph nodes dataset"); validateUserId(edges, "Graph edges dataset");
    const resource = createObservedGraphResource({ id, nodes: requireMaterializedDataset(this, nodes), edges: requireMaterializedDataset(this, edges), definition });
    return this.editSemantic({ property: `resource[graph:${id}]`, value: resource });
  });

export const editGraphData = /* @__PURE__ */ closedAction(
  { op: "editGraphData", description: "Revise an observed graph and preserve typed endpoint identity." }, ["target", "nodes", "edges", "definition"], function (args = {}) {
    const previous = resolveGraphResource(this, args.target, "observed", false);
    const { nodes, edges, definition = {} } = args;
    ownRecord(definition, "Graph definition patch");
    if (Object.keys(args).every(key => key === "target")) throw new TypeError("Graph edits require a nonempty patch.");
    if (Object.entries(args).some(([key, value]) => key !== "target" && value === undefined)) throw new TypeError("Graph edits cannot contain undefined; omission preserves intent.");
    if (nodes === undefined && edges === undefined && !Object.keys(definition).length) throw new TypeError("Graph edits require a nonempty definition or input change.");
    const source = (requested, role) => requested === undefined ? resolveInputReference(this, previous.inputs[previous.options.roles[role]]) : requireMaterializedDataset(this, requested);
    const resource = createObservedGraphResource({ id: previous.id, revision: previous.revision + 1,
      nodes: source(nodes, "nodes"), edges: source(edges, "edges"), definition: { ...previous.options.definition, ...definition } });
    return writeGraphResource(this, resource);
  });

export function registerGraphActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createGraphData, editGraphData, layoutGraph });
}

export function reviseGraphInputs(program, replacements) {
  let next = program;
  for (const resource of program.semanticSpec.resources) {
    if (resource.kind !== "graph") continue;
    const nodes = replacements.get(resource.inputs[resource.options.roles.nodes].id);
    const edges = replacements.get(resource.inputs[resource.options.roles.edges].id);
    if (nodes !== undefined || edges !== undefined) {
      const args = { target: resource.id, ...(nodes === undefined ? {} : { nodes }), ...(edges === undefined ? {} : { edges }) };
      next = resource.options.flow ? next.editFlowData(args) : next.editGraphData(args);
    }
  }
  return next;
}
