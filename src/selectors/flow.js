import { annotateError } from "../core/diagnostics.js";
import { resolveLayoutResource } from "./layouts.js";
import { requireStoredResource, resolveInputReference } from "./resources.js";
import { requireCoordinate } from "./coordinates.js";

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
  if (requested !== undefined) {
    const coordinate = requireCoordinate(program, requested);
    if (coordinate.type !== "cartesian") throw new TypeError("Flow marks require a Cartesian coordinate.");
    return coordinate;
  }
  const eligible = program.semanticSpec.coordinates.filter(coordinate => coordinate.type === "cartesian");
  const current = eligible.find(coordinate => coordinate.id === program.context.currentCoordinate);
  if (current) return current;
  if (eligible.length > 1) throw annotateError(new Error("Flow coordinate is ambiguous; provide an explicit coordinate."), { code: "ambiguous-resource" });
  if (eligible.length === 1) return eligible[0];
  if (program.semanticSpec.coordinates.some(coordinate => coordinate.id === "main")) throw new TypeError("Flow default coordinate conflicts with an existing coordinate.");
  return { id: "main", type: "cartesian" };
}
