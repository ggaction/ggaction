import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { ownRecord } from "../../core/ownData.js";
import { requireMaterializedDataset } from "../../selectors/datasets.js";
import { resolveGraphResource } from "../../selectors/graphs.js";
import { findStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { createFlowResource, FLOW_SOURCE_FIELDS, flowSourceDefinition } from "../../materialization/flow/resources.js";
import { createFlowLayoutResource } from "../../materialization/flow/layoutResource.js";
import { writeGraphResource } from "../graphs/layouts.js";

export const createFlowData = /* @__PURE__ */ closedAction(
  { op: "createFlowData", description: "Create a directed flow graph with explicit values and conservation policy." },
  ["id", "nodes", "edges", ...FLOW_SOURCE_FIELDS], function (args = {}) {
    const { id, nodes, edges, ...definition } = args;
    validateUserId(id, "Flow graph id");
    if (findStoredResource(this, "graph", id)) throw annotateError(new Error("Graph already exists."), { code: "duplicate-id", resourceId: id });
    validateUserId(nodes, "Flow nodes dataset"); validateUserId(edges, "Flow edges dataset");
    const resource = createFlowResource({ id, nodes: requireMaterializedDataset(this, nodes), edges: requireMaterializedDataset(this, edges), definition });
    return this.editSemantic({ property: `resource[graph:${id}]`, value: resource });
  });

export const editFlowData = /* @__PURE__ */ closedAction(
  { op: "editFlowData", description: "Revise a flow graph and its dependent layouts." }, ["target", "nodes", "edges", "definition"], function (args = {}) {
    const previous = resolveGraphResource(this, args.target, "observed", true);
    const { nodes, edges, definition = {} } = args;
    ownRecord(definition, "Flow definition patch");
    if (Object.values(args).some(value => value === undefined)) throw new TypeError("Flow edits cannot contain undefined.");
    if (nodes === undefined && edges === undefined && !Object.keys(definition).length) throw new TypeError("Flow edits require a nonempty patch.");
    const source = (requested, role) => requested === undefined ? resolveInputReference(this, previous.inputs[previous.options.roles[role]]) : requireMaterializedDataset(this, requested);
    const resource = createFlowResource({ id: previous.id, revision: previous.revision + 1, nodes: source(nodes, "nodes"), edges: source(edges, "edges"),
      definition: { ...flowSourceDefinition(previous), ...definition } });
    return writeGraphResource(this, resource);
  });

export const layoutFlow = /* @__PURE__ */ closedAction(
  { op: "layoutFlow", description: "Store a DAG or cyclic flow layout without deleting edges." }, ["id", "graph", "method", "options"], function (args = {}) {
    validateUserId(args.id, "Flow layout id");
    if (findStoredResource(this, "layout", args.id)) throw annotateError(new Error("Layout already exists."), { code: "duplicate-id", resourceId: args.id });
    if (Object.values(args).some(value => value === undefined)) throw new TypeError("Flow layout arguments cannot contain undefined.");
    const graph = resolveGraphResource(this, args.graph);
    const resource = createFlowLayoutResource({ id: args.id, graph, intent: { method: args.method, options: args.options } });
    return this.editSemantic({ property: `resource[layout:${args.id}]`, value: resource });
  });

export function registerFlowActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createFlowData, editFlowData, layoutFlow });
}
