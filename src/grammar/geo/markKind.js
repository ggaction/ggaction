// Semantic kind admission shared by native labels and current-frame readers.
export function isGeoLabelSource(layer) {
  return layer?.mark?.type === "geo" && ["shape", "point", "line", "graticule"].includes(layer.geoBinding?.mode);
}
