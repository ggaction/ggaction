import { createInferredGraphResource } from "../../materialization/graph/inferredResource.js";
import { orderResourceDependencies } from "../../materialization/resourceState.js";
import { requireMaterializedDataset, requireDataset } from "../../selectors/datasets.js";
import { graphSourceRevisions } from "./sourceRevisionContext.js";
import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { ownRecord } from "../../core/ownData.js";
import { findStoredResource, resolveInputReference, dataInputReference } from "../../selectors/resources.js";
import { resolveGraphResource } from "../../selectors/graphs.js";
import { createGraphLayoutResource } from "../../materialization/graph/layoutResource.js";
import { withPreparedResourceResults } from "../primitives/preparedResourceContext.js";
import { mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { resolveGraphPlot } from "../../materialization/graph/plot.js";

function preflightLayouts(program, resources, layouts) {
  preflightFlowLayouts(program, resources, layouts);
  const replacements = new Map(layouts.map(layout => [layout.id, layout]));
  const layers = mapLayerResourceBindings(program.semanticSpec.layers, ref => {
    const replacement = ref.kind === "layout" ? replacements.get(ref.id) : undefined;
    return replacement === undefined ? ref : { ...ref, revision: replacement.revision };
  });
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, resources, layers } };
  for (const layer of layers) if (replacements.has(layer.graphBinding?.layout.id)) {
    resolveGraphPlot(preview, layer, program.materializationConfigs.marks[layer.id].graphPlot);
  }
}

function materializeLayouts(program, ids) {
  let next = materializeFlowLayouts(program, ids);
  for (const layer of program.semanticSpec.layers) if (ids.has(layer.graphBinding?.layout.id)) next = next.materializeGraphPlot({ id: layer.id });
  return next;
}
import { normalizeGraphLayout } from "../../grammar/graph/layoutOptions.js";
import { preflightFlowLayouts, materializeFlowLayouts } from "../flow/closure.js";

export const layoutGraph = /* @__PURE__ */ closedAction(
  { op: "layoutGraph", description: "Compute and store an explicit graph layout." }, ["id", "graph", "method", "options"], function (args = {}) {
    validateUserId(args.id, "Layout id");
    if (findStoredResource(this, "layout", args.id)) throw annotateError(new Error("Layout already exists."), { code: "duplicate-id", resourceId: args.id });
    if (Object.values(args).some(value => value === undefined)) throw new TypeError("Graph layout arguments cannot contain undefined.");
    const graph = resolveGraphResource(this, args.graph);
    const resource = createGraphLayoutResource({ id: args.id, graph, intent: normalizeGraphLayout(args.method, args.options) });
    return this.editSemantic({ property: `resource[layout:${resource.id}]`, value: resource });
  });

export function editGraphLayout(program, args, previous) {
  if (Object.hasOwn(args, "order")) throw new TypeError("Graph layouts do not accept hierarchy order.");
  ownRecord(args.options, "Graph layout options patch");
  if (!Object.keys(args.options).length) throw new TypeError("Graph layout edits require nonempty options.");
  const resource = createGraphLayoutResource({ id: previous.id, revision: previous.revision + 1,
    graph: resolveInputReference(program, previous.inputs[0]),
    intent: { method: previous.options.method, options: { ...previous.options.options, ...args.options } } });
  preflightLayouts(program, program.semanticSpec.resources.map(candidate => candidate === previous ? resource : candidate), [resource]);
  return materializeLayouts(program.editSemantic({ property: `resource[layout:${resource.id}]`, value: resource }), new Set([resource.id]));
}

export function writeGraphResource(program, resource) {
  const graphs = new Map([[resource.id, resource]]), replacements = [], nextLayouts = new Map();
  const sources = graphSourceRevisions(program);
  // A candidate graph can feed another inferred graph. Resolve this DAG before
  // any semantic write so each dependent result is replaced exactly once.
  const supplied = program.semanticSpec.resources.map(previous => previous.kind === "graph" && previous.id === resource.id ? resource : previous);
  for (const previous of orderResourceDependencies(supplied)) {
    let replacement;
    if (previous.kind === "graph" && previous.id !== resource.id && previous.provenance.origin === "inferred" &&
        previous.inputs.length === 2 && graphs.has(previous.inputs[1].id)) {
      const source = sources?.get(previous.inputs[0].id);
      replacement = createInferredGraphResource({ id: previous.id, revision: previous.revision + 1,
        data: source === undefined ? resolveInputReference(program, previous.inputs[0]) : requireMaterializedDataset(program, source),
        candidate: graphs.get(previous.inputs[1].id), definition: previous.options.definition });
      graphs.set(previous.id, replacement);
    } else if (previous.kind === "layout" && previous.inputs.length === 1 && previous.inputs[0].kind === "graph" && graphs.has(previous.inputs[0].id)) {
      replacement = createGraphLayoutResource({ id: previous.id, revision: previous.revision + 1,
        graph: graphs.get(previous.inputs[0].id), intent: previous.options });
      nextLayouts.set(previous.id, replacement);
    }
    if (replacement) replacements.push({ previous: { kind: previous.kind, id: previous.id, revision: previous.revision }, resource: replacement });
  }
  const resources = supplied.map(previous => previous.kind === "graph" ? graphs.get(previous.id) ?? previous
    : previous.kind === "layout" ? nextLayouts.get(previous.id) ?? previous : previous);
  preflightLayouts(program, resources, [...nextLayouts.values()]);
  const next = withPreparedResourceResults(program, { property: `resource[graph:${resource.id}]`, value: resource }, replacements,
    args => program.editSemantic(args), [...(sources ?? [])].map(([from, to]) => ({
      previous: dataInputReference(requireDataset(program, from)), next: dataInputReference(requireDataset(program, to))
    })));
  return materializeLayouts(next, new Set(nextLayouts.keys()));
}
