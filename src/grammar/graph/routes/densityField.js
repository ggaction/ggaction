import { validateRoutePoints } from "./polyline.js";

const TAU = 2 * Math.PI;
export const DENSITY_EPSILON = 1e-9;

export function compactRouteKernel(distanceOverBandwidth) {
  const residual = Math.max(0, 1 - distanceOverBandwidth ** 2);
  return residual * residual;
}

export function routeDensitySamples(points) {
  validateRoutePoints(points);
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  if (!lengths.every(Number.isFinite)) throw new RangeError("Density route segment length must be finite.");
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)], next = points[Math.min(points.length - 1, index + 1)];
    let dx = next.x - previous.x, dy = next.y - previous.y;
    if (dx === 0 && dy === 0) { dx = next.x - point.x; dy = next.y - point.y; }
    const weight = (lengths[index - 1] ?? 0) / 2 + (lengths[index] ?? 0) / 2;
    return { ...point, weight, angle: Math.atan2(dy, dx) };
  });
}

export function directionChannels(angle) {
  const coordinate = ((angle % TAU + TAU) % TAU) * 8 / TAU, lower = Math.floor(coordinate), fraction = coordinate - lower;
  return fraction === 0 ? [[lower, 1]] : [[lower, 1 - fraction], [(lower + 1) % 8, fraction]];
}

// Trusted normalized samples and finite positive grid dimensions from the solver.
// Sparse cells are numerically identical to a zero-filled dense reference grid.
export function createRouteDensityField(samples, bounds, { bandwidth, size, directed }, budget) {
  const cells = new Map(), dx = bounds.width / (size - 1), dy = bounds.height / (size - 1);
  budget.charge(samples.length);
  for (const sample of samples) {
    if (sample.weight === 0) continue;
    const channels = directed ? directionChannels(sample.angle) : [[0, 1]];
    const x0 = Math.max(0, Math.ceil((sample.x - bandwidth - bounds.x) / dx)), x1 = Math.min(size - 1, Math.floor((sample.x + bandwidth - bounds.x) / dx));
    const y0 = Math.max(0, Math.ceil((sample.y - bandwidth - bounds.y) / dy)), y1 = Math.min(size - 1, Math.floor((sample.y + bandwidth - bounds.y) / dy));
    budget.charge(Math.max(0, x1 - x0 + 1) * Math.max(0, y1 - y0 + 1) * channels.length);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const value = sample.weight * compactRouteKernel(Math.hypot(bounds.x + x * dx - sample.x, bounds.y + y * dy - sample.y) / bandwidth);
      if (value === 0) continue;
      for (const [channel, fraction] of channels) {
        const key = (channel * size + y) * size + x, next = (cells.get(key) ?? 0) + value * fraction;
        if (!Number.isFinite(next)) throw new RangeError("Route density must be finite.");
        if (!cells.has(key)) budget.samples(samples.length + cells.size + 1);
        cells.set(key, next);
      }
    }
  }
  return { cells, bounds: { ...bounds }, size, dx, dy, directed };
}

export function routeDensityAt(field, x, y, angle = 0) {
  const { cells, size } = field;
  if (!field.directed) return cells.get(y * size + x) ?? 0;
  let result = 0;
  for (const [channel, weight] of directionChannels(angle)) for (let offset = -1; offset <= 1; offset++) {
    result += weight * (cells.get((((channel + offset + 8) % 8) * size + y) * size + x) ?? 0);
  }
  return result;
}

export function routeGridGradient(field, x, y, angle = 0) {
  const last = field.size - 1, left = Math.max(0, x - 1), right = Math.min(last, x + 1), lower = Math.max(0, y - 1), upper = Math.min(last, y + 1);
  return {
    x: (routeDensityAt(field, right, y, angle) - routeDensityAt(field, left, y, angle)) / ((right - left) * field.dx),
    y: (routeDensityAt(field, x, upper, angle) - routeDensityAt(field, x, lower, angle)) / ((upper - lower) * field.dy)
  };
}

export function sampleRouteGradient(field, point, angle) {
  const { bounds, size, dx, dy } = field;
  const gx = Math.max(0, Math.min(size - 1, (point.x - bounds.x) / dx)), gy = Math.max(0, Math.min(size - 1, (point.y - bounds.y) / dy));
  const x = Math.min(size - 2, Math.floor(gx)), y = Math.min(size - 2, Math.floor(gy)), u = gx - x, v = gy - y;
  const corners = [routeGridGradient(field, x, y, angle), routeGridGradient(field, x + 1, y, angle), routeGridGradient(field, x, y + 1, angle), routeGridGradient(field, x + 1, y + 1, angle)];
  const weights = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
  return { x: corners.reduce((sum, gradient, index) => sum + gradient.x * weights[index], 0), y: corners.reduce((sum, gradient, index) => sum + gradient.y * weights[index], 0) };
}

export function advectDensityRoute(points, samples, field, step) {
  const next = points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return { ...point };
    const gradient = sampleRouteGradient(field, point, samples[index].angle), norm = Math.hypot(gradient.x, gradient.y);
    if (!Number.isFinite(norm)) throw new RangeError("Route density gradient must be finite.");
    if (norm <= DENSITY_EPSILON) return { ...point };
    const { bounds } = field;
    return { x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, point.x + step * gradient.x / norm)), y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, point.y + step * gradient.y / norm)) };
  });
  return next.map((point, index) => index === 0 || index === next.length - 1 ? point : {
    x: next[index - 1].x / 4 + point.x / 2 + next[index + 1].x / 4,
    y: next[index - 1].y / 4 + point.y / 2 + next[index + 1].y / 4
  });
}
