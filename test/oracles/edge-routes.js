// Independent parent-chain intersection and Cox-de Boor basis references.
// These helpers import no production code and are anchored by literal cases.
export function hierarchyPath(parents, source, target) {
  const chain = key => { const values = []; while (key !== null) { values.push(key); key = parents[key]; } return values; };
  const left = chain(source), right = chain(target);
  const common = left.find(key => right.includes(key));
  if (common === undefined) throw new Error("Missing common ancestor.");
  return [...left.slice(0, left.indexOf(common)), common, ...right.slice(0, right.indexOf(common)).reverse()];
}

export function clampedSplinePoint(points, t) {
  if (t === 1) return { ...points.at(-1) };
  const degree = Math.min(3, points.length - 1), knots = [];
  for (let i = 0; i <= degree; i++) knots.push(0);
  for (let i = 1; i < points.length - degree; i++) knots.push(i / (points.length - degree));
  for (let i = 0; i <= degree; i++) knots.push(1);
  function basis(index, order) {
    if (order === 0) return knots[index] <= t && t < knots[index + 1] ? 1 : 0;
    const a = knots[index + order] - knots[index], b = knots[index + order + 1] - knots[index + 1];
    return (a === 0 ? 0 : (t - knots[index]) / a * basis(index, order - 1)) +
      (b === 0 ? 0 : (knots[index + order + 1] - t) / b * basis(index + 1, order - 1));
  }
  return points.reduce((sum, point, index) => { const weight = basis(index, degree); return { x: sum.x + weight * point.x, y: sum.y + weight * point.y }; }, { x: 0, y: 0 });
}

export function polylineDistance(point, points) {
  return Math.min(...points.slice(1).map((b, index) => {
    const a = points[index], dx = b.x - a.x, dy = b.y - a.y, squared = dx * dx + dy * dy;
    const t = squared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / squared));
    return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
  }));
}
