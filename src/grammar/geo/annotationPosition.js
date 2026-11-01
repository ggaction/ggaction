import { geometryCentroid } from "./centroid.js";

// The semantic anchor is chosen in source space, before any camera or clipping.
// Keep its math separate from the Basic-safe annotation shape validator.
export function resolveGeoAnnotationPosition(anchor, feature, coordinateKind) {
  return anchor.type === "position" ? anchor.position : geometryCentroid(feature.geometry, {
    coordinateKind, ...(feature.polygonWinding === undefined ? {} : { polygonWinding: feature.polygonWinding })
  });
}
