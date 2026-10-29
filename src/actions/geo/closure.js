import { applyMaterializationPlan, planCoordinateRematerialization, planLayersDataRematerialization } from "../../materialization/dependencies.js";
import { mapCoordinateResourceBindings, mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { createProjectionResource } from "../../materialization/geo/projectionResource.js";
import { createGeoLODResource } from "../../materialization/geo/lodResource.js";
import { createGeoJoinResource } from "../../materialization/geo/joinResource.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { orderResourceDependencies, validateResourceGraph } from "../../materialization/resourceState.js";
import { withPreparedResourceResults } from "../primitives/preparedResourceContext.js";

export function writeGeometryResource(program, geometry) {
  const key = ref => JSON.stringify([ref.kind, ref.id]), revised = new Map([[key(geometry), geometry]]), entries = [];
  const input = ref => revised.get(key(ref)) ?? resolveInputReference(program, ref);
  for (const previous of orderResourceDependencies(program.semanticSpec.resources)) {
    if (key(previous) === key(geometry) || !previous.inputs.some(ref => revised.has(key(ref)))) continue;
    let resource;
    if (previous.kind === "projection") resource = createProjectionResource({ id: previous.id, revision: previous.revision + 1,
      options: previous.options, geometry: input(previous.inputs[0]) });
    else if (previous.kind === "geometry" && previous.options.method === "geo-join") {
      const { method, ...definition } = previous.options;
      resource = createGeoJoinResource({ id: previous.id, revision: previous.revision + 1, definition,
        geometry: input(previous.inputs[0]), dataset: input(previous.inputs[1]) });
    } else if (previous.kind === "geometry" && previous.options.method === "geo-lod") {
      const { method, ...definition } = previous.options;
      resource = createGeoLODResource({ program, id: previous.id, revision: previous.revision + 1, definition,
        geometries: previous.inputs.map(input), input, logicalId: previous.result.identity.logicalId, allocationId: previous.result.identity.allocationId });
    } else continue;
    entries.push({ previous: { kind: previous.kind, id: previous.id, revision: previous.revision }, resource });
    revised.set(key(resource), resource);
  }
  const rebind = ref => revised.has(key(ref)) ? { ...ref, revision: revised.get(key(ref)).revision } : ref;
  const coordinates = mapCoordinateResourceBindings(program.semanticSpec.coordinates, rebind);
  const layers = mapLayerResourceBindings(program.semanticSpec.layers, rebind);
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, coordinates, layers,
    resources: program.semanticSpec.resources.map(resource => revised.get(key(resource)) ?? resource) } };
  validateResourceGraph(preview, program.constructor);
  const next = withPreparedResourceResults(program, { property: `resource[geometry:${geometry.id}]`, value: geometry }, entries,
    args => program.editSemantic(args));
  const projectionIds = new Set(entries.filter(entry => entry.resource.kind === "projection").map(entry => entry.resource.id));
  const coordinateIds = new Set(next.semanticSpec.coordinates.filter(coordinate => coordinate.type === "geo" && projectionIds.has(coordinate.projection.id)).map(coordinate => coordinate.id));
  const markIds = next.semanticSpec.layers.filter(layer => layer.mark.type === "geo" &&
    (layer.geoBinding.geometry && revised.has(key(layer.geoBinding.geometry)) || coordinateIds.has(layer.coordinate))).map(layer => layer.id);
  return applyMaterializationPlan(next, planLayersDataRematerialization(next, markIds));
}

export function rematerializeProjectionCoordinates(program, ids) {
  const targets = new Set(ids);
  const plan = program.semanticSpec.coordinates.filter(coordinate => coordinate.type === "geo" && targets.has(coordinate.projection.id))
    .flatMap(coordinate => planCoordinateRematerialization(program, coordinate.id));
  return applyMaterializationPlan(program, plan);
}
