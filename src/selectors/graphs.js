import { annotateError } from "../core/diagnostics.js";
import { resolveInputReference, requireStoredResource } from "./resources.js";
import { resolveLayoutResource } from "./layouts.js";
import { GRAPH_LAYOUT_METHODS } from "../core/vocabulary.js";

export function resolveGraphPlotLayout(program, requested) {
  return resolveLayoutResource(program, requested, "graph", GRAPH_LAYOUT_METHODS);
}

export function resolveGraphResource(program, target, origin) {
  const eligible = resource => resource.kind === "graph" && (origin === undefined || resource.provenance.origin === origin);
  if (target !== undefined) {
    const resource = requireStoredResource(program, { kind: "graph", id: target });
    if (!eligible(resource)) throw annotateError(new Error("Graph origin is incompatible with this action."), { code: "incompatible-resource", resourceId: target });
    return resource;
  }
  const resources = program.semanticSpec.resources.filter(eligible);
  const current = resources.find(resource => resource.id === program.context.currentResources?.graph);
  if (current !== undefined) return current;
  if (resources.length !== 1) throw annotateError(new Error("An explicit graph id is required unless one eligible graph exists."), {
    code: resources.length ? "ambiguous-resource" : "missing-resource", candidates: resources.map(resource => resource.id)
  });
  return resources[0];
}

export function resolveGraphLayerResources(program, layer) {
  const layout = resolveInputReference(program, layer.graphBinding.layout);
  if (layout.kind !== "layout" || layout.inputs.length !== 1 || layout.inputs[0].kind !== "graph" || !GRAPH_LAYOUT_METHODS.includes(layout.options.method)) throw new TypeError("Graph plots require a fixed, circular or force graph layout.");
  const graph = resolveInputReference(program, layout.inputs[0]);
  return { layout, graph, nodesData: resolveInputReference(program, graph.inputs[graph.options.roles.nodes]),
    edgesData: resolveInputReference(program, graph.inputs[graph.options.roles.edges]) };
}
