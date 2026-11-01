import { prepareGeoResourceRevisions, geographicConsumerIds } from "../geo/closure.js";
import { orderResourceDependencies } from "../../materialization/resourceState.js";
import { applyMaterializationPlan, planLayersDataRematerialization } from "../../materialization/dependencies.js";
import { createEdgeRouteResource } from "../../materialization/graph/routeResource.js";
import { mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { resolveGraphPlot } from "../../materialization/graph/plot.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { routeValueHash } from "../../grammar/graph/routes/job.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";

const key = ref => JSON.stringify([ref.kind, ref.id]);

export function needsScreenRouteRevision(program, resource) {
  return resource.kind === "edge-route" && resource.options.coordinateSpace === "screen" &&
    routeValueHash(resource.result.viewport) !== routeValueHash(resolveGraphicBounds(program));
}

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
    if (previous.kind !== "edge-route" || !previous.inputs.some(ref => candidates.get(key(ref))?.revision !== ref.revision) &&
        !needsScreenRouteRevision(program, previous)) continue;
    const preview = { ...program, semanticSpec: { ...program.semanticSpec, resources } };
    const inputs = previous.inputs.map(ref => resolveInputReference(preview, { ...ref, revision: candidates.get(key(ref))?.revision ?? ref.revision }));
    const resource = reviseEdgeRouteResource(preview, previous, inputs);
    entries.push({ previous: { kind: previous.kind, id: previous.id, revision: previous.revision }, resource });
    candidates.set(key(resource), resource);
  }
  const geo = prepareGeoResourceRevisions(program, resources.map(resource => candidates.get(key(resource))));
  const finalResources = geo.resources;
  const ids = new Set(entries.map(entry => entry.resource.id));
  const layers = mapLayerResourceBindings(program.semanticSpec.layers, ref => {
    const candidate = candidates.get(key(ref));
    return candidate === undefined || candidate.revision === ref.revision ? ref : { ...ref, revision: candidate.revision };
  });
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, resources: finalResources, layers } };
  for (const layer of layers) if (ids.has(layer.graphBinding?.routes?.id)) resolveGraphPlot(preview, layer, program.markConfigs[layer.id].graphPlot);
  return { resources: finalResources, entries: [...entries, ...geo.entries], ids };
}

export function edgeRouteGeoConsumers(program, ids) {
  const affected = new Set([...ids].map(id => key({ kind: "edge-route", id })));
  for (const resource of orderResourceDependencies(program.semanticSpec.resources)) {
    if (resource.inputs.some(ref => affected.has(key(ref)))) affected.add(key(resource));
  }
  return geographicConsumerIds(program, affected);
}

export function materializeEdgeRouteConsumers(program, ids) {
  const marks = program.semanticSpec.layers.filter(layer => ids.has(layer.graphBinding?.routes?.id)).map(layer => layer.id);
  return applyMaterializationPlan(program, planLayersDataRematerialization(program, [...marks, ...edgeRouteGeoConsumers(program, ids)]));
}
