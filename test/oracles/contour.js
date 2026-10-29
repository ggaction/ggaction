// Independent polygon area and point-location checks. No production imports.
export function signedRingArea(ring) {
  let twice = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    twice += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return twice / 2;
}

export function contourArea(polygons) {
  return polygons.reduce((total, polygon) => total + signedRingArea(polygon.outer) +
    polygon.holes.reduce((sum, ring) => sum + signedRingArea(ring), 0), 0);
}

export function locateContourPoint(polygons, [x, y]) {
  const winding = ring => {
    let number = 0;
    for (let index = 1; index < ring.length; index += 1) {
      const [ax, ay] = ring[index - 1], [bx, by] = ring[index];
      const side = (bx - ax) * (y - ay) - (x - ax) * (by - ay);
      if (ay <= y && by > y && side > 0) number += 1;
      if (ay > y && by <= y && side < 0) number -= 1;
    }
    return number;
  };
  return polygons.some(polygon => winding(polygon.outer) !== 0 && polygon.holes.every(ring => winding(ring) === 0));
}

// A linear scalar plane has a straight contour, so independent half-plane
// clipping supplies exact polygons without a marching-squares case table.
export function clipScalarPlane(rectangle, coefficients, lower, upper) {
  let points = rectangle.slice();
  const value = ([x, y]) => coefficients[0] * x + coefficients[1] * y + coefficients[2];
  for (const [threshold, sign] of [[lower, 1], [upper, -1]]) {
    const result = [];
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index], b = points[(index + 1) % points.length];
      const av = sign * (value(a) - threshold), bv = sign * (value(b) - threshold);
      if (av >= 0) result.push(a);
      if (av * bv < 0) {
        const fraction = av / (av - bv);
        result.push([a[0] + fraction * (b[0] - a[0]), a[1] + fraction * (b[1] - a[1])]);
      }
    }
    points = result;
  }
  return points.length ? [...points, points[0]] : [];
}
