import { resolveLayoutResource } from "./layouts.js";
import { requireStoredResource, resolveInputReference } from "./resources.js";
import { resolveCartesianCoordinate } from "./coordinates.js";

export function resolveFlowLayout(program, requested) {
  return resolveLayoutResource(program, requested, "graph", ["dag", "cyclic"]);
}
export function resolveFlowLayerResources(program, layer) {
  const layout = requireStoredResource(program, layer.flowBinding.layout);
  if (layout.inputs.length !== 1 || layout.inputs[0].kind !== "graph" || !["dag", "cyclic"].includes(layout.options.method)) throw new TypeError("Flow marks require a DAG or cyclic graph layout.");
  const graph = resolveInputReference(program, layout.inputs[0]);
  const role = layer.mark.type === "flow-node" ? "nodes" : "edges";
  const dataset = resolveInputReference(program, graph.inputs[graph.options.roles?.[role] ?? 0]);
  const nodesDataset = resolveInputReference(program, graph.inputs[graph.options.roles?.nodes ?? 0]);
  return { layout, graph, dataset, nodesDataset };
}
export function resolveFlowCoordinate(program, requested) {
  return resolveCartesianCoordinate(program, requested, "Flow marks");
}
