// Independent periodic coverage and shoelace fixtures; no production imports.
export function patternInk(style, x, y, width) {
  const nearest = value => Math.abs(value - Math.round(value));
  if (style === "solid") return true;
  if (width === 0) return false;
  if (style === "dots") return Math.hypot(nearest(x), nearest(y)) <= width / 2;
  if (style === "diagonal") return nearest(y - x) / Math.SQRT2 <= width / 2;
  if (style === "antidiagonal") return nearest(y + x) / Math.SQRT2 <= width / 2;
  const horizontal = nearest(y) <= width / 2, vertical = nearest(x) <= width / 2;
  return style === "horizontal" ? horizontal : style === "vertical" ? vertical : horizontal || vertical;
}

export function polygonArea(points) {
  const [originX, originY] = points[0];
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] - originX) * (next[1] - originY) - (point[1] - originY) * (next[0] - originX);
  }, 0) / 2;
}

export function polygonContains(points, x, y) {
  let winding = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [ax, ay] = points[index], [bx, by] = points[(index + 1) % points.length];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (ay <= y && by > y && cross > 0) winding += 1;
    if (ay > y && by <= y && cross < 0) winding -= 1;
  }
  return winding !== 0;
}
