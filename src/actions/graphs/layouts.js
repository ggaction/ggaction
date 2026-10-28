import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { ownRecord } from "../../core/ownData.js";
import { findStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { resolveGraphResource } from "../../selectors/graphs.js";
import { createGraphLayoutResource } from "../../materialization/graph/layoutResource.js";
import { withPreparedResourceResults } from "../primitives/preparedResourceContext.js";

export const layoutGraph = /* @__PURE__ */ closedAction(
  { op: "layoutGraph", description: "Compute and store an explicit graph layout." }, ["id", "graph", "method", "options"], function (args = {}) {
    validateUserId(args.id, "Layout id");
    if (findStoredResource(this, "layout", args.id)) throw annotateError(new Error("Layout already exists."), { code: "duplicate-id", resourceId: args.id });
    if (Object.values(args).some(value => value === undefined)) throw new TypeError("Graph layout arguments cannot contain undefined.");
    const graph = resolveGraphResource(this, args.graph);
    const resource = createGraphLayoutResource({ id: args.id, graph, intent: { method: args.method, options: args.options } });
    return this.editSemantic({ property: `resource[layout:${resource.id}]`, value: resource });
  });

export function editGraphLayout(program, args, previous) {
  if (Object.hasOwn(args, "order")) throw new TypeError("Graph layouts do not accept hierarchy order.");
  ownRecord(args.options, "Graph layout options patch");
  if (!Object.keys(args.options).length) throw new TypeError("Graph layout edits require nonempty options.");
  const resource = createGraphLayoutResource({ id: previous.id, revision: previous.revision + 1,
    graph: resolveInputReference(program, previous.inputs[0]),
    intent: { method: previous.options.method, options: { ...previous.options.options, ...args.options } } });
  return program.editSemantic({ property: `resource[layout:${resource.id}]`, value: resource });
}

export function writeGraphResource(program, resource) {
  const layouts = program.semanticSpec.resources.filter(candidate => candidate.kind === "layout" &&
    candidate.inputs.length === 1 && candidate.inputs[0].kind === "graph" && candidate.inputs[0].id === resource.id);
  const replacements = layouts.map(layout => ({ previous: { kind: "layout", id: layout.id, revision: layout.revision },
    resource: createGraphLayoutResource({ id: layout.id, revision: layout.revision + 1, graph: resource, intent: layout.options }) }));
  return withPreparedResourceResults(program, { property: `resource[graph:${resource.id}]`, value: resource }, replacements,
    args => program.editSemantic(args));
}
