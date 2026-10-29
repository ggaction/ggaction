import { chart } from "../../src/index.js";
import { canvas, shapes, cities, routes, projection, grid, annotations, measuredCities, fieldMappings } from "./fixture.js";
export function createGeographicMarks(variant = "planar") {
  if (variant === "annotations") return createGeographicMarks("planar")
    .createGeoAnnotation(annotations[0]).createGeoAnnotation(annotations[1]).createGeoAnnotation(annotations[2]);
  if (variant === "graticule") return chart().createCanvas(canvas).createProjection(projection)
    .createCoordinate({ type: "geo" }).createGraticule(grid);
  if (!["planar", "fields"].includes(variant)) throw new Error("Unknown geographic chart variant.");
  const program = chart().createCanvas(canvas)
    .createGeometryData({ id: "districts", format: "geojson", coordinateKind: "planar", featureKey: "id", values: shapes })
    .createGeometryData({ id: "stops", format: "geojson", coordinateKind: "planar", featureKey: "id", values: variant === "fields" ? measuredCities : cities })
    .createGeometryData({ id: "services", format: "geojson", coordinateKind: "planar", featureKey: "id", values: routes })
    .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
    .createGeoShapeMark({ geometry: "districts", fill: "#93c5fd", stroke: "#1e40af", strokeWidth: 2 })
    .createGeoLineMark({ geometry: "services", stroke: "#475569", strokeWidth: 3 })
    .createGeoPointMark({ geometry: "stops", fill: "#dc2626", radiusPx: 8 });
  if (variant === "fields") return program.encodeColor(fieldMappings[0][1]).encodeColor(fieldMappings[1][1])
    .encodeColor(fieldMappings[2][1]).encodeSize(fieldMappings[3][1]);
  return program;
}
