import { findStoredResource } from "./resources.js";

export function graphRecomputeOwners(program, graphId) {
  return program.semanticSpec.layers.filter(layer => {
    if (program.materializationConfigs.marks?.[layer.id]?.graphPlot?.view?.recompute === undefined) return false;
    const layout = findStoredResource(program, "layout", layer.graphBinding.layout.id);
    return layout.inputs[0].id === graphId;
  });
}

export function activeGraphFilter(program, layer) {
  return layer.mark?.type === "graph" ? program.materializationConfigs.marks[layer.id]?.graphPlot?.view : undefined;
}
