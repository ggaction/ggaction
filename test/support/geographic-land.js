import { chart } from "../../src/index.js";
export const landCanvas = Object.freeze({ width: 720, height: 360, margin: 0 });
export const landChecks = Object.freeze([
  { point: [80,180], expected: [255,255,255,255], region: "Pacific Ocean" },
  { point: [300,180], expected: [255,255,255,255], region: "Atlantic Ocean" },
  { point: [520,240], expected: [255,255,255,255], region: "Indian Ocean" },
  { point: [160,100], expected: [219,228,238,255], region: "North America" },
  { point: [400,180], expected: [219,228,238,255], region: "Africa" },
  { point: [560,100], expected: [219,228,238,255], region: "Asia" },
  { point: [630,230], expected: [219,228,238,255], region: "Australia" },
  { point: [360,350], expected: [219,228,238,255], region: "Antarctica" }
]);
export function geographicLandProgram(values) {
  return chart().createCanvas(landCanvas)
    .createGeometryData({ id: "land", format: "geojson", coordinateKind: "geographic", polygonWinding: "left-hand", values })
    .createProjection({ id: "map", type: "equirectangular", scalePx: 360 / Math.PI, translatePx: [360,180] })
    .createCoordinate({ id: "earth", type: "geo", projection: "map" })
    .createGeoShapeMark({ id: "land", coordinate: "earth", geometry: "land", fill: "#dbe4ee", strokeWidth: 0 });
}
