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
export const annotations = [
  { id: "west-label", anchor: { type: "feature", geometry: "stops", key: 0 }, text: "West", dy: -16, align: "center", fontSize: 18, fill: "#0f172a" },
  { id: "central-label", anchor: { type: "feature", geometry: "stops", key: 1 }, text: "Central", dy: -16, align: "center", fontSize: 18, fill: "#0f172a" },
  { id: "east-label", anchor: { type: "feature", geometry: "stops", key: 2 }, text: "East", dy: -16, align: "center", fontSize: 18, fill: "#0f172a" }
];
export const measuredCities = { ...cities, features: cities.features.map((feature, index) => ({ ...feature,
  properties: { ...feature.properties, visitors: [1, 4, 9][index] } })) };
export const fieldMappings = [
  ["encodeColor", { target: "geo-shape", field: "name", scale: { id: "district-color", range: ["#bfdbfe"] } }],
  ["encodeColor", { target: "geo-line", field: "name", scale: { id: "route-color", range: ["#7c3aed"] } }],
  ["encodeColor", { target: "geo-point", field: "name", scale: { id: "stop-color", range: ["#2563eb", "#0d9488", "#dc2626"] } }],
  ["encodeSize", { target: "geo-point", field: "visitors", scale: { id: "stop-size", domain: [1, 9], range: [64 * Math.PI, 576 * Math.PI] } }]
];
export const cameraOperations = [
  { type: "zoom", anchorPx: [320, 240], factor: .75, scaleExtent: [.5, 4] },
  { type: "pan", deltaPx: [15, -10] }
];
export const variants = [
  { id: "camera", chart: "geographic-marks", title: "A centered zoom preserves stop size" },
  { id: "fields", chart: "geographic-fields", title: "Stop area follows visitor counts" },
  { id: "annotations", chart: "geographic-annotations", title: "Labels stay attached to the original stops" },
  { id: "planar", chart: "geographic-marks", title: "A district, stops and service route" },
  { id: "graticule", chart: "geographic-grid", title: "Longitude and latitude on one projection" }
];
