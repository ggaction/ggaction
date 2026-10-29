import { geometryCentroid } from "../../grammar/geo/centroid.js";
import { createProjectionKernel } from "../../grammar/geo/projections.js";
import { geoMarkSource, geoFeatureKey } from "./source.js";

export function geoLabelAnchors(program, layer, items) {
  const source = geoMarkSource(program, layer, program.materializationConfigs.marks[layer.id].geo);
  const projection = createProjectionKernel(source.parameters);
  const keys = new Set(items.map(item => item.key));
  return new Map(source.drawableFeatures.filter(feature => keys.has(geoFeatureKey(layer, source.resource, feature))).map(feature => {
    const centroid = geometryCentroid(feature.geometry, { coordinateKind: source.coordinateKind,
      ...(feature.polygonWinding === undefined ? {} : { polygonWinding: feature.polygonWinding }) });
    const point = projection.forward(centroid).point;
    return [geoFeatureKey(layer, source.resource, feature), point === null ? undefined : { x: point[0], y: point[1] }];
  }));
}
