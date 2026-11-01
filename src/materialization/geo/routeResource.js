import { cloneAndFreeze } from "../../core/immutable.js";
import { createSourceIdentity } from "../../core/itemIdentity.js";
import { normalizeGeoRouteOptions, routeGeometryFeatures } from "../../grammar/geo/routes.js";

export function createGeoRouteResource({ id, revision = 0, routes, definition, logicalId, allocationId }) {
  const options = normalizeGeoRouteOptions(definition);
  if (routes.kind !== "edge-route" || options.coordinateKind === "geographic" && routes.options.coordinateSpace !== "world") {
    throw new TypeError("Geographic coordinates require world edge routes; planar coordinates require an edge route.");
  }
  const { features, diagnostics } = routeGeometryFeatures(routes.result.routes, options.coordinateKind);
  const identity = createSourceIdentity(features, { keys: features.map(feature => feature.properties.edgeKey) }, { logicalId, allocationId });
  return cloneAndFreeze({ kind: "geometry", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: [{ kind: "edge-route", id: routes.id, revision: routes.revision }], options,
    result: { features, identity: { ...identity, revision }, coordinateKind: options.coordinateKind, diagnostics },
    provenance: { origin: routes.provenance.origin, sourceRows: routes.provenance.sourceRows } });
}
