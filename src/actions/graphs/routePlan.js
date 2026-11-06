import { cloneAndFreeze } from "../../core/immutable.js";
import { mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { validateResourceGraphStages } from "../../materialization/resourceState.js";
import { drainStages } from "../../core/stages.js";
import { resolveGraphPlot } from "../../materialization/graph/plot.js";
import { applyMaterializationPlan, planLayersDataRematerialization } from "../../materialization/dependencies.js";
import { prepareGeoResourceRevisionsStages } from "../geo/closure.js";
import { withPreparedResourceResults } from "../primitives/preparedResourceContext.js";
import { edgeRouteGeoConsumers, materializeEdgeRouteConsumers } from "./routeClosure.js";

// The same owner prepares the complete native consumer closure and applies it
// through the existing wrapped primitives. This record grants no authority.
export function planEdgeRouteApplication(program, resource, previous, scope) {
  return drainStages(planEdgeRouteApplicationStages(program, resource, previous, scope));
}

export function* planEdgeRouteApplicationStages(program, resource, previous, scope) {
  const resources = previous === undefined ? [...program.semanticSpec.resources, resource]
    : program.semanticSpec.resources.map(candidate => candidate === previous ? resource : candidate);
  const geo = yield* prepareGeoResourceRevisionsStages(program, resources, scope);
  const layers = mapLayerResourceBindings(geo.preview.semanticSpec.layers, ref => ref.kind === "edge-route" && ref.id === resource.id
    ? { ...ref, revision: resource.revision } : ref);
  const preview = { ...geo.preview, semanticSpec: { ...geo.preview.semanticSpec, layers } };
  yield* validateResourceGraphStages(preview, program.constructor, scope);
  for (const layer of layers) if (layer.graphBinding?.routes?.id === resource.id) resolveGraphPlot(preview, layer, program.markConfigs[layer.id].graphPlot);
  // Preserve the v1 timing of its materialization-plan validation.
  if (scope === undefined) return { entries: geo.entries };
  const ids = new Set([resource.id]);
  const marks = layers.filter(layer => ids.has(layer.graphBinding?.routes?.id)).map(layer => layer.id);
  return cloneAndFreeze({ entries: geo.entries, materialization: planLayersDataRematerialization(preview,
    [...marks, ...edgeRouteGeoConsumers(preview, ids)]) });
}

export function applyEdgeRouteApplication(program, resource, plan, scope) {
  scope?.ledger.check();
  const next = withPreparedResourceResults(program, { property: `resource[edge-route:${resource.id}]`, value: resource }, plan.entries,
    input => program.editSemantic(input), [], scope);
  const result = plan.materialization === undefined ? materializeEdgeRouteConsumers(next, new Set([resource.id]))
    : applyMaterializationPlan(next, plan.materialization);
  scope?.ledger.check();
  return result;
}
