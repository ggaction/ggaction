import { canvas, shapes, cities, routes, projection, grid, variants } from "../../../examples/geographic-marks/fixture.js";
export { canvas, variants };
const stroke = { lineCap: "butt", lineJoin: "miter", miterLimit: 10 };
const commands = coordinates => coordinates.map(([x, y], index) => ({ op: index === 0 ? "M" : "L", x, y }));
export const region = { type: "path", properties: { fill: "#93c5fd", stroke: "#1e40af", strokeWidth: 2, opacity: 1, ...stroke,
  commands: shapes.geometry.coordinates.flatMap(ring => [...commands(ring.slice(0, -1)), { op: "Z" }]), fillRule: "evenodd" } };
export const route = { type: "path", properties: { fill: "none", stroke: "#475569", strokeWidth: 3, opacity: 1, ...stroke, commands: commands(routes.geometry.coordinates) } };
export const points = cities.features.map(({ geometry }) => ({ type: "circle", properties: { fill: "#dc2626", stroke: "none", strokeWidth: 0, opacity: 1, ...stroke, x: geometry.coordinates[0], y: geometry.coordinates[1], radius: 8 } }));
// Independent equirectangular equations on a fixed 5-degree geographic grid.
const lines = [
  ...[-40, 0, 40].map(x => Array.from({ length: 9 }, (_, i) => [x, -20 + i * 5])),
  ...[-20, 0, 20].map(y => Array.from({ length: 17 }, (_, i) => [-40 + i * 5, y]))
];
export const graticule = lines.map(coordinates => ({ type: "path", properties: { fill: "none", stroke: grid.stroke, strokeWidth: 2, opacity: 1, ...stroke,
  commands: commands(coordinates.map(([x, y]) => [x * Math.PI / 180 * projection.scalePx + 320, 240 - y * Math.PI / 180 * projection.scalePx])) } }));

export const annotationText = [
  { x: 120, y: 114, text: "West" }, { x: 400, y: 204, text: "Central" }, { x: 520, y: 314, text: "East" }
].map(position => ({ type: "text", properties: { ...position, fill: "#0f172a", opacity: 1, fontSize: 18,
  fontFamily: "sans-serif", fontWeight: "normal", textAlign: "center", textBaseline: "alphabetic", rotation: 0 } }));

// A linear area range [64π, 576π] at visitor counts [1, 4, 9] gives radii [8, 16, 24].
export const measuredRegion = { ...region, properties: { ...region.properties, fill: "#bfdbfe" } };
export const measuredRoute = { ...route, properties: { ...route.properties, stroke: "#7c3aed" } };
export const measuredPoints = points.map((point, i) => ({ ...point, properties: { ...point.properties,
  fill: ["#2563eb", "#0d9488", "#dc2626"][i], radius: [8, 16, 24][i] } }));

// Independent affine fixture: anchored .75 zoom then [15,-10] pan gives [95,50] translation.
const cameraCommands = values => values.map(command => command.op === "Z" ? command :
  { ...command, x: command.x * .75 + 95, y: command.y * .75 + 50 });
export const cameraRegion = { ...region, properties: { ...region.properties, commands: cameraCommands(region.properties.commands) } };
export const cameraRoute = { ...route, properties: { ...route.properties, commands: cameraCommands(route.properties.commands) } };
export const cameraPoints = points.map(point => ({ ...point, properties: { ...point.properties,
  x: point.properties.x * .75 + 95, y: point.properties.y * .75 + 50 } }));
