import { annotateError } from "../core/diagnostics.js";
import { requireStoredResource } from "./resources.js";

export function resolveGeometryResource(program, target) {
  const eligible = resource => resource.kind === "geometry" && resource.options.method === "geo";
  if (target !== undefined) {
    const resource = requireStoredResource(program, { kind: "geometry", id: target });
    if (!eligible(resource)) throw annotateError(new Error("Geometry is not a geographic source resource."), { code: "incompatible-resource", resourceId: target });
    return resource;
  }
  const candidates = program.semanticSpec.resources.filter(eligible);
  const current = candidates.find(resource => resource.id === program.context.currentResources?.geometry);
  if (current !== undefined) return current;
  if (candidates.length !== 1) throw annotateError(new Error("An explicit geometry id is required unless one eligible source exists."), {
    code: candidates.length ? "ambiguous-resource" : "missing-resource", candidates: candidates.map(resource => resource.id)
  });
  return candidates[0];
}
