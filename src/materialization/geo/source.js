import { requireStoredResource } from "../../selectors/resources.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { validateGeoMarkBinding } from "../../grammar/geo/mark.js";
import { graticuleFeatures } from "../../grammar/geo/graticule.js";
import { projectionParameters } from "../../grammar/geo/projectionDefinition.js";

export function geoMarkSource(program, layer, config) {
  validateGeoMarkBinding(layer, config);
  const coordinate = requireCoordinate(program, layer.coordinate);
  if (coordinate.type !== "geo") throw new TypeError("Geographic marks require a Geo coordinate.");
  const projection = requireStoredResource(program, coordinate.projection), parameters = projectionParameters(projection);
  const binding = layer.geoBinding, generated = binding.mode === "graticule";
  const resource = generated ? undefined : requireStoredResource(program, binding.geometry);
  if (resource !== undefined && resource.options.method !== "geo") throw new TypeError("Geographic marks require geographic or planar source geometry.");
  const coordinateKind = resource?.options.coordinateKind ?? "geographic";
  if ((coordinateKind === "planar") !== (parameters.type === "identity")) throw new TypeError("Geometry coordinateKind and Geo projection are incompatible.");
  if (binding.radiusDeg !== undefined && coordinateKind !== "geographic") throw new TypeError("radiusDeg requires geographic source coordinates.");
  const features = generated ? graticuleFeatures(binding.graticule) : resource.result.features.map((feature, index) => ({ ...feature, key: resource.result.identity.rowKeys[index] }));
  return { binding, projection, resource, coordinateKind, parameters, features };
}


export function geoFeatureKey(layer, resource, feature) {
  return JSON.stringify([[], layer.id, "geo", [resource?.result.identity.logicalId ?? "graticule", feature.key]]);
}
