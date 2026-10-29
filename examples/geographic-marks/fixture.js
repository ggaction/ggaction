export const canvas = { width: 640, height: 480, margin: 40 };
export const shapes = { type: "Feature", id: "district", properties: { name: "District" }, geometry: { type: "Polygon", coordinates: [
  [[80, 90], [360, 90], [360, 370], [80, 370], [80, 90]],
  [[160, 170], [160, 290], [280, 290], [280, 170], [160, 170]]
] } };
export const cities = { type: "FeatureCollection", features: [[120, 130], [400, 220], [520, 330]].map((coordinates, index) => ({
  type: "Feature", id: index, properties: { name: ["West", "Central", "East"][index] }, geometry: { type: "Point", coordinates }
})) };
export const routes = { type: "Feature", id: "service", properties: { name: "Service route" }, geometry: { type: "LineString", coordinates: cities.features.map(feature => feature.geometry.coordinates) } };
export const projection = { id: "map", type: "equirectangular", scalePx: 180 / Math.PI * 4, translatePx: [320, 240] };
export const grid = { stepDeg: [40, 20], extentDeg: [[-40, -20], [40, 20]], precisionDeg: 5, stroke: "#475569", strokeWidth: 2 };
export const variants = [
  { id: "planar", chart: "geographic-marks", title: "A district, stops and service route" },
  { id: "graticule", chart: "geographic-grid", title: "Longitude and latitude on one projection" }
];
