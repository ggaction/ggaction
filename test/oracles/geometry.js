export function signedPolygonArea(points) {
  if (!Array.isArray(points) || points.length < 3 || points.some(point =>
    !Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite))) {
    throw new Error("Polygon reference requires at least three finite coordinate pairs.");
  }
  const area = points.reduce((sum, [x, y], i) => {
    const [nextX, nextY] = points[(i + 1) % points.length];
    return sum + x * nextY - nextX * y;
  }, 0) / 2;
  if (!Number.isFinite(area)) throw new Error("Polygon area exceeds finite precision.");
  return area;
}
