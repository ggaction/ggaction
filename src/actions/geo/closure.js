import { createGeoRouteResource } from "../../materialization/geo/routeResource.js";
import { resolveGeoMark } from "../../materialization/geo/mark.js";
import { getLayerScaleIds } from "../../materialization/marks/index.js";
import { resolveScalePreview } from "../scales/preview.js";
import { applyMaterializationPlan, planCoordinateRematerialization, planLayersDataRematerialization } from "../../materialization/dependencies.js";
import { mapCoordinateResourceBindings, mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { createProjectionResource } from "../../materialization/geo/projectionResource.js";
import { createGeoLODResource } from "../../materialization/geo/lodResource.js";
import { createGeoJoinResource } from "../../materialization/geo/joinResource.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { orderResourceDependencies, validateResourceGraphStages } from "../../materialization/resourceState.js";
import { drainStages } from "../../core/stages.js";
import { withPreparedResourceResults } from "../primitives/preparedResourceContext.js";

export function preflightGeoConsumers(program, ids) {
  const selected = new Set(ids);
  const layers = program.semanticSpec.layers.filter(layer => layer.mark.type === "geo" && selected.has(layer.id));
  const resolvedScales = { ...program.resolvedScales };
  for (const id of new Set(layers.flatMap(getLayerScaleIds))) resolvedScales[id] = resolveScalePreview(program, id).resolvedScale;
  for (const layer of layers) resolveGeoMark(program, layer, program.materializationConfigs.marks[layer.id].geo, resolvedScales);
}

const key = ref => JSON.stringify([ref.kind, ref.id]);

export function geographicConsumerIds(program, revised) {
  const coordinateIds = new Set(program.semanticSpec.coordinates.filter(coordinate => coordinate.type === "geo" &&
    revised.has(key(coordinate.projection))).map(coordinate => coordinate.id));
  return program.semanticSpec.layers.filter(layer => layer.mark.type === "geo" &&
    (layer.geoBinding.geometry && revised.has(key(layer.geoBinding.geometry)) || coordinateIds.has(layer.coordinate))).map(layer => layer.id);
}

// One ordered closure for authored geometry and route-derived geometry. Callers
// supply all already-computed roots before any dependent geometry is prepared.
export function prepareGeoResourceRevisions(program, resources, routeScope) {
  return drainStages(prepareGeoResourceRevisionsStages(program, resources, routeScope));
}

export function* prepareGeoResourceRevisionsStages(program, resources, routeScope) {
  const candidates = new Map(resources.map(resource => [key(resource), resource])), revised = new Map(), entries = [];
  for (const previous of program.semanticSpec.resources) {
    const next = candidates.get(key(previous));
    if (next !== undefined && next.revision !== previous.revision) revised.set(key(next), next);
  }
  const input = ref => candidates.get(key(ref)) ?? resolveInputReference(program, ref);
  for (const previous of orderResourceDependencies(program.semanticSpec.resources)) {
    if (revised.has(key(previous)) || !previous.inputs.some(ref => revised.has(key(ref)))) continue;
    let resource;
    if (previous.kind === "projection") resource = createProjectionResource({ id: previous.id, revision: previous.revision + 1,
      options: previous.options, geometry: input(previous.inputs[0]), input });
    else if (previous.kind === "geometry" && previous.options.method === "geo-routes") {
      resource = createGeoRouteResource({ id: previous.id, revision: previous.revision + 1,
        definition: { coordinateKind: previous.options.coordinateKind }, routes: input(previous.inputs[0]),
        logicalId: previous.result.identity.logicalId, allocationId: previous.result.identity.allocationId });
    } else if (previous.kind === "geometry" && previous.options.method === "geo-join") {
      const { method, ...definition } = previous.options;
      resource = createGeoJoinResource({ id: previous.id, revision: previous.revision + 1, definition,
        geometry: input(previous.inputs[0]), dataset: input(previous.inputs[1]) });
    } else if (previous.kind === "geometry" && previous.options.method === "geo-lod") {
      const { method, ...definition } = previous.options;
      resource = createGeoLODResource({ program, id: previous.id, revision: previous.revision + 1, definition,
        geometries: previous.inputs.map(input), input, logicalId: previous.result.identity.logicalId, allocationId: previous.result.identity.allocationId });
    } else continue;
    entries.push({ previous: { kind: previous.kind, id: previous.id, revision: previous.revision }, resource });
    revised.set(key(resource), resource); candidates.set(key(resource), resource);
  }
  const rebind = ref => revised.has(key(ref)) ? { ...ref, revision: revised.get(key(ref)).revision } : ref;
  const coordinates = mapCoordinateResourceBindings(program.semanticSpec.coordinates, rebind);
  const layers = mapLayerResourceBindings(program.semanticSpec.layers, rebind);
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, coordinates, layers,
    resources: resources.map(resource => candidates.get(key(resource))) } };
  yield* validateResourceGraphStages(preview, program.constructor, routeScope);
  const markIds = geographicConsumerIds(preview, revised);
  preflightGeoConsumers(preview, markIds);
  return { entries, resources: preview.semanticSpec.resources, markIds, preview };
}

export function writeGeometryResource(program, geometry) {
  const plan = prepareGeoResourceRevisions(program, program.semanticSpec.resources.map(resource => key(resource) === key(geometry) ? geometry : resource));
  const next = withPreparedResourceResults(program, { property: `resource[geometry:${geometry.id}]`, value: geometry }, plan.entries,
    args => program.editSemantic(args));
  return applyMaterializationPlan(next, planLayersDataRematerialization(next, plan.markIds));
}

export function rematerializeProjectionCoordinates(program, ids) {
  const targets = new Set(ids);
  const plan = program.semanticSpec.coordinates.filter(coordinate => coordinate.type === "geo" && targets.has(coordinate.projection.id))
    .flatMap(coordinate => planCoordinateRematerialization(program, coordinate.id));
  return applyMaterializationPlan(program, plan);
}
