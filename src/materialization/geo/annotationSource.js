import { validateGeoAnnotationBinding } from "../../grammar/geo/annotation.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { validateWorkLimit } from "../../core/validation.js";
import { geographicCoordinateKind } from "../../selectors/geometry.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { projectionParameters } from "../../grammar/geo/projectionDefinition.js";
import { geographicFeatures, geographicFeatureKeys } from "./features.js";

export function annotationFeatureSource(program, resource, anchor) {
  const input = ref => resolveInputReference(program, ref);
  let root = resource; const seen = new Set();
  while (root.options.method === "geo-join") {
    if (seen.has(root.id)) throw new TypeError("Annotation feature source cannot be cyclic.");
    seen.add(root.id); validateWorkLimit(seen.size, "Annotation source work");
    root = input(root.inputs[0]);
  }
  let source = resource, level;
  if (root.options.method === "geo-lod") {
    level = anchor.level ?? root.options.activeLevel;
    const index = root.options.levels.findIndex(item => item.id === level);
    if (index < 0) throw new TypeError("Unknown annotation detail level.");
    source = input(root.inputs[index]);
  } else if (anchor.level !== undefined) throw new TypeError("Annotation level requires geographic detail levels.");
  const token = encodeRowKey(anchor.key);
  const index = geographicFeatureKeys(source, input).findIndex(key => encodeRowKey(key) === token);
  if (index < 0) throw new TypeError("Unknown annotation feature key.");
  const feature = geographicFeatures(program, source)[index];
  return { feature, level, key: level === undefined ? resource.result.identity.rowKeys[index] : encodeRowKey([level, token]) };
}

export function geoAnnotationSource(program, layer, config) {
  validateGeoAnnotationBinding(layer, config);
  const binding = layer.geoBinding, coordinate = requireCoordinate(program, layer.coordinate);
  if (coordinate.type !== "geo") throw new TypeError("Geographic annotations require a Geo coordinate.");
  const projection = resolveInputReference(program, coordinate.projection), parameters = projectionParameters(projection);
  const resource = binding.geometry === undefined ? undefined : resolveInputReference(program, binding.geometry);
  const coordinateKind = resource === undefined ? parameters.type === "identity" ? "planar" : "geographic" : geographicCoordinateKind(resource);
  if ((coordinateKind === "planar") !== (parameters.type === "identity")) throw new TypeError("Annotation coordinateKind and projection are incompatible.");
  let feature = { fields: {}, rows: [], geometry: { type: "Point", coordinates: binding.anchor.position } }, key = "position";
  if (resource !== undefined) {
    const resolved = annotationFeatureSource(program, resource, binding.anchor);
    if (resolved.level !== binding.anchor.level) throw new TypeError("Stored annotation requires its resolved detail level.");
    feature = resolved.feature; key = resolved.key;
  }
  return { binding, resource, projection, parameters, coordinateKind,
    features: [{ ...feature, key }] };
}
