import { geographicPolygonWinding } from "./features.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { normalizeProjectionDefinition } from "../../grammar/geo/projectionDefinition.js";
import { fitGeometryProjection } from "../../grammar/geo/fit.js";
import { geographicCoordinateKind } from "../../selectors/geometry.js";

export function createProjectionResource({ id, revision = 0, options, geometry, input }) {
  const normalized = normalizeProjectionDefinition(options), { fit, ...parameters } = normalized;
  let result = {}, inputs = [];
  if (fit !== undefined) {
    const coordinateKind = geographicCoordinateKind(geometry);
    const computed = fitGeometryProjection({ type: "GeometryCollection", geometries: geometry.result.features.map(feature => feature.geometry) },
      { ...parameters, scalePx: fit.pointScale }, fit, { coordinateKind, ...(coordinateKind === "geographic" ? { polygonWinding: geographicPolygonWinding(geometry, input) } : {}) });
    result = { scalePx: computed.parameters.scalePx, translatePx: computed.parameters.translatePx, bounds: computed.bounds };
    inputs = [{ kind: "geometry", id: geometry.id, revision: geometry.revision }];
  }
  return cloneAndFreeze({ kind: "projection", id, revision, algorithmVersion: "1", ownership: { mode: "authored" }, inputs,
    options: normalized, result, provenance: { origin: "authored", sourceRows: [] } });
}
