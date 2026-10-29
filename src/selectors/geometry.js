import { annotateError } from "../core/diagnostics.js";
import { requireStoredResource } from "./resources.js";

export function isGeographicGeometry(resource) {
  return resource?.kind === "geometry" && ["geo", "geo-join", "geo-lod"].includes(resource.options.method);
}

export function geographicCoordinateKind(resource) {
  if (!isGeographicGeometry(resource)) throw new TypeError("A geographic or planar geometry source resource is required.");
  return resource.options.method === "geo" ? resource.options.coordinateKind : resource.result.coordinateKind;
}

export function resolveGeometryResource(program, target, { method } = {}) {
  const eligible = resource => isGeographicGeometry(resource) && (method === undefined || resource.options.method === method);
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
