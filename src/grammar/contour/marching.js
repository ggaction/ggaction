// Shared edge identities make adjacent cells use exactly the same crossing.
function crossing(a, b, threshold, cache) {
  if (a.id > b.id) [a, b] = [b, a];
  if (a.value === threshold) return a;
  if (b.value === threshold) return b;
  const id = `${a.id}:${b.id}:${threshold}`;
  if (cache.has(id)) return cache.get(id);
  const scale = Math.max(Math.abs(a.value), Math.abs(b.value), Math.abs(threshold));
  const fraction = (threshold / scale - a.value / scale) / (b.value / scale - a.value / scale);
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) throw new RangeError("Contour crossing exceeds numeric precision.");
  const point = fraction === 0 ? a : fraction === 1 ? b : {
    id, x: a.x + fraction * (b.x - a.x), y: a.y + fraction * (b.y - a.y)
  };
  cache.set(id, point);
  return point;
}

export function contourCellSegments(corners, threshold, inclusive, cache) {
  const inside = corners.map(point => inclusive ? point.value >= threshold : point.value > threshold);
  const boundary = [], transitions = [];
  for (let index = 0; index < 4; index += 1) {
    const next = (index + 1) % 4, a = corners[index], b = corners[next];
    if (inside[index] && inside[next]) boundary.push([a, b]);
    else if (inside[index] !== inside[next]) {
      const point = crossing(a, b, threshold, cache);
      const exit = inside[index];
      boundary.push(exit ? [a, point] : [point, b]);
      transitions.push({ index, point, exit });
    }
  }
  const interior = [];
  if (transitions.length === 2) {
    interior.push([transitions.find(edge => edge.exit).point, transitions.find(edge => !edge.exit).point]);
  } else if (transitions.length === 4) {
    // Scaling first avoids overflow in both the subtraction and determinant.
    const scale = Math.max(Math.abs(threshold), ...corners.map(point => Math.abs(point.value)));
    const z = corners.map(point => point.value / scale - threshold / scale);
    const determinant = z[0] * z[2] - z[1] * z[3];
    const diagonal = determinant >= 0;
    const pairs = diagonal ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]];
    for (const [first, second] of pairs) {
      const a = transitions[first], b = transitions[second];
      interior.push(a.exit ? [a.point, b.point] : [b.point, a.point]);
    }
  }
  return { boundary, interior };
}

export function contourBandBoundary(corners, lower, upper, upperInclusive, cache) {
  const segments = [];
  for (let index = 0; index < 4; index += 1) {
    const a = corners[index], b = corners[(index + 1) % 4];
    if (a.value === b.value) {
      if (a.value >= lower && (upperInclusive ? a.value <= upper : a.value < upper)) segments.push([a, b]);
      continue;
    }
    const points = [a];
    for (const value of [lower, upper]) {
      if (value > Math.min(a.value, b.value) && value < Math.max(a.value, b.value)) points.push(crossing(a, b, value, cache));
    }
    points.push(b);
    points.sort((p, q) => (p.x - q.x) * (b.x - a.x) + (p.y - q.y) * (b.y - a.y));
    for (let part = 1; part < points.length; part += 1) {
      const p = points[part - 1], q = points[part];
      const t = Math.abs(b.x - a.x) ? ((p.x + q.x) / 2 - a.x) / (b.x - a.x) : ((p.y + q.y) / 2 - a.y) / (b.y - a.y);
      const value = (1 - t) * a.value + t * b.value;
      if (value >= lower && (upperInclusive ? value <= upper : value < upper)) segments.push([p, q]);
    }
  }
  return segments;
}
