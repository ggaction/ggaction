import { createEdgeRouteResource } from "../../materialization/graph/routeResource.js";
import { mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { resolveGraphPlot } from "../../materialization/graph/plot.js";
import { resolveInputReference } from "../../selectors/resources.js";

const key = ref => JSON.stringify([ref.kind, ref.id]);

export function reviseEdgeRouteResource(program, previous, inputs) {
  const [graph, layout, hierarchy, hierarchyLayout] = inputs;
  return createEdgeRouteResource({ program, id: previous.id, revision: previous.revision + 1,
    intent: previous.options, graph, layout, hierarchy, hierarchyLayout });
}

// Existing owners provide their complete candidate resource state first. Each
// route is computed once after every one of its input revisions is available.
export function prepareEdgeRouteRevisions(program, resources) {
  const candidates = new Map(resources.map(resource => [key(resource), resource])), entries = [];
  for (const previous of program.semanticSpec.resources) {
    if (previous.kind !== "edge-route" || !previous.inputs.some(ref => candidates.get(key(ref))?.revision !== ref.revision)) continue;
    const preview = { ...program, semanticSpec: { ...program.semanticSpec, resources } };
    const inputs = previous.inputs.map(ref => resolveInputReference(preview, { ...ref, revision: candidates.get(key(ref))?.revision ?? ref.revision }));
    const resource = reviseEdgeRouteResource(preview, previous, inputs);
    entries.push({ previous: { kind: previous.kind, id: previous.id, revision: previous.revision }, resource });
    candidates.set(key(resource), resource);
  }
  const finalResources = resources.map(resource => candidates.get(key(resource)));
  const ids = new Set(entries.map(entry => entry.resource.id));
  const layers = mapLayerResourceBindings(program.semanticSpec.layers, ref => {
    const candidate = candidates.get(key(ref));
    return candidate === undefined || candidate.revision === ref.revision ? ref : { ...ref, revision: candidate.revision };
  });
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, resources: finalResources, layers } };
  for (const layer of layers) if (ids.has(layer.graphBinding?.routes?.id)) resolveGraphPlot(preview, layer, program.markConfigs[layer.id].graphPlot);
  return { resources: finalResources, entries, ids };
}

export function materializeEdgeRouteConsumers(program, ids) {
  let next = program;
  for (const layer of program.semanticSpec.layers) if (ids.has(layer.graphBinding?.routes?.id)) next = next.materializeGraphPlot({ id: layer.id });
  return next;
}
