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
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, resources: program.semanticSpec.resources.map(resource =>
    resource.kind === "geometry" && resource.id === geometry.id ? geometry : resource.kind === "projection" ? byId.get(resource.id) ?? resource : resource) } };
  validateResourceGraph(preview, program.constructor);
  return withPreparedResourceResults(program, { property: `resource[geometry:${geometry.id}]`, value: geometry }, entries,
    args => program.editSemantic(args));
}
