import { annotateError } from "../core/diagnostics.js";
import { requireStoredResource } from "./resources.js";

export function resolveContourResource(program, target) {
  const eligible = resource => resource.kind === "geometry" && resource.options.method === "contour";
  if (target !== undefined) {
    const resource = requireStoredResource(program, { kind: "geometry", id: target });
    if (!eligible(resource)) throw annotateError(new Error("Geometry is not a contour resource."), { code: "incompatible-resource", resourceId: target });
    return resource;
  }
  const resources = program.semanticSpec.resources.filter(eligible);
  const current = resources.find(resource => resource.id === program.context.currentResources?.geometry);
  if (current !== undefined) return current;
  if (resources.length !== 1) throw annotateError(new Error("An explicit contour id is required unless one eligible resource exists."), {
    code: resources.length ? "ambiguous-resource" : "missing-resource", candidates: resources.map(resource => resource.id)
  });
  return resources[0];
}
