// Independent mathematical recipes: wedge centroid and arrow bounds-center.
// No source geometry, public program or materialized graphic is read here.
const vertices = {
  wedge: [[0, -2 / Math.sqrt(3)], [-1 / 4, 1 / Math.sqrt(3)], [1 / 4, 1 / Math.sqrt(3)]],
  arrow: [[-1 / 7, 1], [1 / 7, 1], [1 / 7, -1 / 8], [2 / 5, -1 / 8],
    [0, -1], [-2 / 5, -1 / 8], [-1 / 7, -1 / 8]]
};
export function signedPolygonArea(points) {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0) / 2;
}
export function directionalCommands(shape, area, angle, x, y) {
  const radians = angle * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians);
  const rotated = vertices[shape].map(([u, v]) => ({ x: u * cos - v * sin, y: u * sin + v * cos }));
  const factor = Math.sqrt(area / Math.abs(signedPolygonArea(rotated)));
  return [...rotated.map((point, i) => ({ op: i === 0 ? "M" : "L",
    x: x + point.x * factor, y: y + point.y * factor })), { op: "Z" }];
}
export function namedShapeItems() {
  return [["wedge", 100, 0, 85, 100], ["wedge", 225, 90, 195, 100],
    ["arrow", 100, 0, 85, 180], ["arrow", 225, 90, 195, 180]].map(args => ({
      type: "path", properties: { commands: directionalCommands(...args), fill: "#4c78a8", opacity: 1 }
    }));
}
