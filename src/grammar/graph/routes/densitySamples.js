import { validateGeneratedItemLimit } from "../../../core/validation.js";
import { validateRoutePoints } from "./polyline.js";

// Both representations use exactly the same segment, weight and tangent math.
// Points have already passed the owning route validator before storage exists.
function visitSamples(points, lengths, visit) {
  for (let i = 1; i < points.length; i++) lengths[i - 1] = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  for (let i = 0; i < points.length - 1; i++) if (!Number.isFinite(lengths[i])) throw new RangeError("Density route segment length must be finite.");
  for (let index = 0; index < points.length; index++) {
    const point = points[index], previous = points[Math.max(0, index - 1)], next = points[Math.min(points.length - 1, index + 1)];
    let dx = next.x - previous.x, dy = next.y - previous.y;
    if (dx === 0 && dy === 0) { dx = next.x - point.x; dy = next.y - point.y; }
    const weight = (index === 0 ? 0 : lengths[index - 1]) / 2 + (index === points.length - 1 ? 0 : lengths[index]) / 2;
    visit(index, weight, Math.atan2(dy, dx));
  }
}

export function routeDensitySamples(points) {
  validateRoutePoints(points);
  const result = new Array(points.length);
  visitSamples(points, new Array(points.length - 1), (index, weight, angle) => {
    result[index] = { ...points[index], weight, angle };
  });
  return result;
}

export function densitySampleByteBound(count, edges, longest) {
  if (![count, edges, longest].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff) ||
      edges > count / 2 || longest > count) throw new RangeError("Density sample buffer sizes must be bounded integers.");
  return count * 16 + (edges + 1) * 4 + longest * 8;
}

// Solver-private storage: coordinates remain in the original immutable routes.
// Existing sample capacity bounds every count and the derived byte reservation;
// V2 additionally reserves these buffers in its request ledger, not the whole JS heap.
export function prepareDensitySamples(routes, budget) {
  budget.check();
  let count = 0, longest = 0;
  for (const points of routes) {
    budget.check(); validateRoutePoints(points);
    count += points.length; longest = Math.max(longest, points.length - 1);
    validateGeneratedItemLimit(count, "Route active samples", budget.limits.maxSamples);
  }
  const maximumBytes = densitySampleByteBound(count, routes.length, longest);
  const table = { weights: undefined, angles: undefined, offsets: undefined, count, bytes: 0, peakBytes: 0 };
  if (budget.reserve !== undefined) table.release = budget.release;
  let lengths;
  const reserve = bytes => {
    budget.check();
    const next = table.bytes + bytes;
    validateGeneratedItemLimit(next, "Density sample buffer bytes", maximumBytes);
    budget.reserve?.(bytes); table.bytes = next; table.peakBytes = Math.max(table.peakBytes, next);
  };
  try {
    reserve(count * 8); table.weights = new Float64Array(count);
    reserve(count * 8); table.angles = new Float64Array(count);
    reserve((routes.length + 1) * 4); table.offsets = new Uint32Array(routes.length + 1);
    reserve(longest * 8); lengths = new Float64Array(longest);
    let cursor = 0;
    for (let edge = 0; edge < routes.length; edge++) {
      budget.check(); table.offsets[edge] = cursor;
      visitSamples(routes[edge], lengths, (index, weight, angle) => {
        table.weights[cursor + index] = weight; table.angles[cursor + index] = angle;
      });
      cursor += routes[edge].length;
    }
    table.offsets[routes.length] = cursor;
    budget.release?.(lengths.byteLength); table.bytes -= lengths.byteLength;
    return table;
  } catch (error) {
    disposeDensitySamples(table); throw error;
  } finally { lengths = undefined; }
}

export function disposeDensitySamples(table) {
  table.release?.(table.bytes); delete table.release;
  table.weights = table.angles = table.offsets = undefined;
  table.count = table.bytes = table.peakBytes = 0;
}
