import { ownArray } from "../../core/ownData.js";
import { requireLayer } from "../../selectors/layers.js";
import { normalizeAnimationGeoGroup } from "../../grammar/animation/geoState.js";
import { geoMarkSource } from "../geo/source.js";
import { geoAppearanceValues, geoFeatureAppearance } from "../geo/appearance.js";

// Explicit native owner projection. Keep offscreen features so current camera
// clipping may reveal them without inventing source state from endpoint pixels.
export function projectGeoAnimationGroup(program, layer, namespaces = []) {
  ownArray(namespaces, "Animation Geo namespace");
  if (namespaces.some(part => typeof part !== "string" || !part)) throw new TypeError("Animation Geo namespaces require explicit strings.");
  if (requireLayer(program, layer.id) !== layer || layer.mark.type !== "geo" || layer.geoBinding.mode === "annotation") throw new TypeError("Animation Geo preparation requires its exact native feature layer.");
  const config = program.materializationConfigs.marks[layer.id].geo;
  const source = geoMarkSource(program, layer, config), features = source.drawableFeatures;
  const mapped = geoAppearanceValues(program, layer, features);
  return normalizeAnimationGeoGroup({ key: JSON.stringify([namespaces, layer.id]), binding: source.binding,
    coordinateKind: source.coordinateKind, projection: { kind: "projection", id: source.projection.id, revision: source.projection.revision },
    parameters: source.parameters, logicalId: source.resource?.result.identity.logicalId ?? source.binding.mode,
    features: features.map((feature, index) => ({ key: feature.key, geometry: feature.geometry,
      radiusPx: geoFeatureAppearance(config, source.binding, mapped, index).radiusPx,
      ...(source.coordinateKind === "geographic" ? { polygonWinding: feature.polygonWinding ?? "right-hand" } : {}) })) });
}
