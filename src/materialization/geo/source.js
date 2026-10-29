import { requireStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { geographicCoordinateKind, isGeographicGeometry } from "../../selectors/geometry.js";
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
  if (resource !== undefined && !isGeographicGeometry(resource)) throw new TypeError("Geographic marks require geographic or planar source geometry.");
  const coordinateKind = resource === undefined ? "geographic" : geographicCoordinateKind(resource);
  if ((coordinateKind === "planar") !== (parameters.type === "identity")) throw new TypeError("Geometry coordinateKind and Geo projection are incompatible.");
  if (binding.radiusDeg !== undefined && coordinateKind !== "geographic") throw new TypeError("radiusDeg requires geographic source coordinates.");
  const features = generated ? graticuleFeatures(binding.graticule) : geographicFeatures(program, resource);
  return { binding, projection, resource, coordinateKind, parameters, features };
}


export function geoFeatureKey(layer, resource, feature) {
  return JSON.stringify([[], layer.id, "geo", [resource?.result.identity.logicalId ?? "graticule", feature.key]]);
}

// One metadata path for source geometry, joins and current detail representations.
// The resource DAG has already been validated; an explicit stack also supports
// long join chains without relying on the JavaScript call stack.
export function geographicFeatures(program, resource) {
  const chain = []; let source = resource;
  while (source.options.method !== "geo") {
    chain.push(source);
    const index = source.options.method === "geo-lod"
      ? source.options.levels.findIndex(level => level.id === source.options.activeLevel) : 0;
    source = resolveInputReference(program, source.inputs[index]);
  }
  let features = source.result.features.map((feature, index) => ({ ...feature,
    key: source.result.identity.rowKeys[index], fields: feature.properties ?? {}, rows: [] }));
  for (const current of chain.reverse()) {
    let aliases;
    if (current.options.method === "geo-lod") {
      aliases = new Map(current.result.identity.rowKeys.map(key => [key, []]));
      for (const level of current.result.mapping) for (const region of level.regions) {
        for (const key of region.representations) aliases.get(key).push(region.key);
      }
    }
    const dataset = current.options.method === "geo-join" ? resolveInputReference(program, current.inputs[1]) : undefined;
    features = current.result.features.map((feature, index) => {
      const key = current.result.identity.rowKeys[index], row = current.result.rowMap?.[index];
      return { ...features[index], ...feature, key,
        ...(aliases === undefined ? {} : { representationKeys: aliases.get(key) }),
        ...(dataset === undefined ? {} : { fields: row === null ? {} : dataset.values[row],
          rows: row === null ? [] : [current.provenance.sourceRows[row]] }) };
    });
  }
  return features;
}
