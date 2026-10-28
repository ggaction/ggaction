// Independent ray-circle intersection. Fixtures use modest finite coordinates.
export function radialOffset(gradient, point) {
  const dx = point.x - gradient.focal.x, dy = point.y - gradient.focal.y;
  if (dx === 0 && dy === 0) return 0;
  const ox = gradient.focal.x - gradient.center.x, oy = gradient.focal.y - gradient.center.y;
  const a = dx * dx + dy * dy, b = 2 * (ox * dx + oy * dy);
  const c = ox * ox + oy * oy - gradient.radius * gradient.radius;
  const intersection = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return intersection > 0 ? 1 / intersection : null;
}
export function referenceCircle(gradient, offset) {
  return { x: gradient.focal.x + (gradient.center.x - gradient.focal.x) * offset,
    y: gradient.focal.y + (gradient.center.y - gradient.focal.y) * offset, radius: gradient.radius * offset };
}
