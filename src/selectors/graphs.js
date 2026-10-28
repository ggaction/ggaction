import { annotateError } from "../core/diagnostics.js";
import { requireStoredResource } from "./resources.js";

export function resolveGraphResource(program, target, origin, flow) {
  const eligible = resource => resource.kind === "graph" && (origin === undefined || resource.provenance.origin === origin) &&
    (flow === undefined || Object.hasOwn(resource.options, "flow") === flow);
  if (target !== undefined) {
    const resource = requireStoredResource(program, { kind: "graph", id: target });
    if (!eligible(resource)) throw annotateError(new Error("Graph origin is incompatible with this action."), { code: "incompatible-resource", resourceId: target });
    return resource;
  }
  const resources = program.semanticSpec.resources.filter(eligible);
  const current = resources.find(resource => resource.id === program.context.currentResources?.graph);
  if (current !== undefined) return current;
  if (resources.length !== 1) throw annotateError(new Error("An explicit graph id is required unless one eligible graph exists."), {
    code: resources.length ? "ambiguous-resource" : "missing-resource", candidates: resources.map(resource => resource.id)
  });
  return resources[0];
}
