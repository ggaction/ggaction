import { mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { resolveFlowPlot } from "../../materialization/flow/plot.js";

export function preflightFlowLayouts(program, resources, layouts) {
  const replacements = new Map(layouts.map(layout => [layout.id, layout]));
  const layers = mapLayerResourceBindings(program.semanticSpec.layers, ref => {
    const replacement = ref.kind === "layout" ? replacements.get(ref.id) : undefined;
    return replacement === undefined ? ref : { ...ref, revision: replacement.revision };
  });
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, resources, layers } };
  for (const layer of layers) if (replacements.has(layer.flowBinding?.layout.id)) {
    resolveFlowPlot(preview, layer, program.materializationConfigs.marks[layer.id].flowPlot);
  }
}

export function materializeFlowLayouts(program, ids) {
  let next = program;
  for (const layer of program.semanticSpec.layers) if (ids.has(layer.flowBinding?.layout.id)) {
    next = next[layer.mark.type === "flow-node" ? "materializeFlowNodes" : "materializeFlowLinks"]({ id: layer.id });
  }
  return next;
}
