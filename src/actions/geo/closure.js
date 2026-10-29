import { applyMaterializationPlan, planCoordinateRematerialization, planLayersDataRematerialization } from "../../materialization/dependencies.js";
import { mapCoordinateResourceBindings, mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { createProjectionResource } from "../../materialization/geo/projectionResource.js";
import { validateResourceGraph } from "../../materialization/resourceState.js";
import { withPreparedResourceResults } from "../primitives/preparedResourceContext.js";

export function writeGeometryResource(program, geometry) {
  const entries = program.semanticSpec.resources.filter(resource => resource.kind === "projection" &&
    resource.inputs.some(ref => ref.kind === "geometry" && ref.id === geometry.id)).map(previous => ({
      previous: { kind: "projection", id: previous.id, revision: previous.revision },
      resource: createProjectionResource({ id: previous.id, revision: previous.revision + 1, options: previous.options, geometry })
    }));
  const byId = new Map(entries.map(entry => [entry.resource.id, entry.resource]));
  const coordinates = mapCoordinateResourceBindings(program.semanticSpec.coordinates, ref => {
    const resource = ref.kind === "projection" ? byId.get(ref.id) : undefined;
    return resource === undefined ? ref : { ...ref, revision: resource.revision };
  });
  const layers = mapLayerResourceBindings(program.semanticSpec.layers, ref =>
    ref.kind === "geometry" && ref.id === geometry.id ? { ...ref, revision: geometry.revision } : ref);
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, coordinates, layers, resources: program.semanticSpec.resources.map(resource =>
    resource.kind === "geometry" && resource.id === geometry.id ? geometry : resource.kind === "projection" ? byId.get(resource.id) ?? resource : resource) } };
  validateResourceGraph(preview, program.constructor);
  const next = withPreparedResourceResults(program, { property: `resource[geometry:${geometry.id}]`, value: geometry }, entries,
    args => program.editSemantic(args));
  const projectionIds = new Set(entries.map(entry => entry.resource.id));
  const coordinateIds = new Set(next.semanticSpec.coordinates.filter(coordinate => coordinate.type === "geo" && projectionIds.has(coordinate.projection.id)).map(coordinate => coordinate.id));
  const markIds = next.semanticSpec.layers.filter(layer => layer.mark.type === "geo" &&
    (layer.geoBinding.geometry?.id === geometry.id || coordinateIds.has(layer.coordinate))).map(layer => layer.id);
  return applyMaterializationPlan(next, planLayersDataRematerialization(next, markIds));
}

export function rematerializeProjectionCoordinates(program, ids) {
  const targets = new Set(ids);
  const plan = program.semanticSpec.coordinates.filter(coordinate => coordinate.type === "geo" && targets.has(coordinate.projection.id))
    .flatMap(coordinate => planCoordinateRematerialization(program, coordinate.id));
  return applyMaterializationPlan(program, plan);
}
