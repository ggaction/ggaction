import { canvas, shapes, cities, routes, projection, grid, variants, annotations, measuredCities, fieldMappings, cameraOperations } from "../../../examples/geographic-marks/fixture.js";
import { createGeographicMarks } from "../../../examples/geographic-marks/program.js";
import { createGeographicPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = variants.map(variant => {
  const calls = variant.id === "graticule" ? [["createCanvas", canvas], ["createProjection", projection], ["createCoordinate", { type: "geo" }], ["createGraticule", grid]]
    : [["createCanvas", canvas], ...[["districts", shapes], ["stops", variant.id === "fields" ? measuredCities : cities], ["services", routes]].map(([id, values]) => ["createGeometryData", { id, format: "geojson", coordinateKind: "planar", featureKey: "id", values }]),
      ["createProjection", { id: "map", type: "identity" }], ["createCoordinate", { type: "geo" }], ["createGeoShapeMark", { geometry: "districts", fill: "#93c5fd", stroke: "#1e40af", strokeWidth: 2 }],
      ["createGeoLineMark", { geometry: "services", stroke: "#475569", strokeWidth: 3 }], ["createGeoPointMark", { geometry: "stops", fill: "#dc2626", radiusPx: 8 }]];
  if (variant.id === "camera") calls.push(["navigateProjection", { target: "map", operation: cameraOperations[0] }], ["navigateProjection", { operation: cameraOperations[1] }]);
  if (variant.id === "fields") calls.push(...fieldMappings);
  if (variant.id === "annotations") calls.push(...annotations.map(options => ["createGeoAnnotation", options]));
  return defineVisualVariant({ chart: variant.chart, variant: variant.id, title: variant.title, width: canvas.width, height: canvas.height,
    primitive: () => createGeographicPrimitive(variant.id), userFacing: () => createGeographicMarks(variant.id),
    programEquivalence: "render", compareSemanticSpec: false,
    callChain: "chart()" + calls.map(([op, args]) => `\n  .${op}(${JSON.stringify(args)})`).join("") + ";",
    artifact: { scope: "charts", capability: "geographic-marks" }, colors: [variant.id === "graticule" ? "#475569" : variant.id === "fields" ? "#bfdbfe" : "#93c5fd"],
    regions: [{ name: "geographic output", x: 40, y: 40, width: 560, height: 400, minimumInkPixels: 1000 }] });
});
