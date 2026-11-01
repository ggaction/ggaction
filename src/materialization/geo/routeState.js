import { ownArray, ownRecord } from "../../core/ownData.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { validateSourceIdentity, encodeRowKey } from "../../core/itemIdentity.js";
import { normalizeGeoRouteOptions } from "../../grammar/geo/routes.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { createGeoRouteResource } from "./routeResource.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires exact stored fields.`);
}
function validateStored(resource) {
  ownRecord(resource.options, "Geographic route intent");
  const { method, ...definition } = resource.options;
  if (method !== "geo-routes" || !same(normalizeGeoRouteOptions(definition), resource.options) ||
      !same(resource.ownership, { mode: "authored" }) || resource.inputs.length !== 1 || resource.inputs[0].kind !== "edge-route") {
    throw new TypeError("Geographic routes require normalized coordinate intent and one exact edge-route input.");
  }
  const { result } = resource;
  exact(result, ["features", "identity", "coordinateKind", "diagnostics"], "Geographic route result");
  exact(result.identity, ["logicalId", "revision", "allocationId", "keySpec", "rowKeys", "nextGeneratedKey"], "Geographic route identity");
  ownArray(result.features, "Geographic route features");
  for (const feature of result.features) {
    exact(feature, ["properties", "sourcePath", "geometry", "drawable"], "Geographic route feature");
    exact(feature.properties, ["edgeKey"], "Geographic route properties");
    ownArray(feature.sourcePath, "Geographic route source path");
    exact(feature.geometry, ["type", "coordinates"], "Geographic route line");
    ownArray(feature.geometry.coordinates, "Geographic route coordinates");
    feature.geometry.coordinates.forEach(position => ownArray(position, "Geographic route position"));
  }
  exact(result.diagnostics, ["features", "positions", "arcs", "values", "work"], "Geographic route diagnostics");
  validateSourceIdentity({ ...result.identity, values: result.features });
  if (result.identity.revision !== resource.revision || result.coordinateKind !== definition.coordinateKind ||
      result.identity.keySpec.mode !== "explicit" || !same(result.identity.rowKeys,
        result.features.map(feature => encodeRowKey(feature.properties.edgeKey)))) throw new TypeError("Geographic route feature identity is stale.");
}
function validateBindings(program, resource) {
  const { method, ...definition } = resource.options;
  const expected = createGeoRouteResource({ id: resource.id, revision: resource.revision, definition,
    routes: resolveInputReference(program, resource.inputs[0]), logicalId: resource.result.identity.logicalId, allocationId: resource.result.identity.allocationId });
  if (!same(resource.result, expected.result) || !same(resource.provenance, expected.provenance)) throw new TypeError("Geographic routes disagree with their retained edge-route input.");
}
export const geoRouteResourceHandler = Object.freeze({ validateStored, validateBindings });
