import { cloneAndFreeze } from "../../core/immutable.js";
import { normalizeProjectionDefinition } from "../../grammar/geo/projectionDefinition.js";
import { fitGeometryProjection } from "../../grammar/geo/fit.js";

export function createProjectionResource({ id, revision = 0, options, geometry }) {
  const normalized = normalizeProjectionDefinition(options), { fit, ...parameters } = normalized;
  let result = {}, inputs = [];
  if (fit !== undefined) {
    if (geometry?.kind !== "geometry" || geometry.options.method !== "geo") throw new TypeError("Projection fit requires a geographic or planar geometry source.");
    const computed = fitGeometryProjection({ type: "GeometryCollection", geometries: geometry.result.features.map(feature => feature.geometry) },
      { ...parameters, scalePx: fit.pointScale }, fit, { coordinateKind: geometry.options.coordinateKind });
    result = { scalePx: computed.parameters.scalePx, translatePx: computed.parameters.translatePx, bounds: computed.bounds };
    inputs = [{ kind: "geometry", id: geometry.id, revision: geometry.revision }];
  }
  return cloneAndFreeze({ kind: "projection", id, revision, algorithmVersion: "1", ownership: { mode: "authored" }, inputs,
    options: normalized, result, provenance: { origin: "authored", sourceRows: [] } });
}
