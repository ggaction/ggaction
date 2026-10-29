import { validateRoutePoints } from "./polyline.js";

export const FDEB_EPSILON = 1e-9;

export function forceEdgeMetric(points) {
  validateRoutePoints(points);
  if (points.length !== 2) throw new TypeError("Force compatibility requires exactly two endpoints per edge.");
  const [source, target] = points.map(point => Object.freeze({ ...point })), dx = target.x - source.x, dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length)) throw new RangeError("Force compatibility edge length must be finite.");
  return Object.freeze({ source, target, length, x: length === 0 ? 0 : dx / length, y: length === 0 ? 0 : dy / length,
    midpoint: Object.freeze({ x: source.x + dx / 2, y: source.y + dy / 2 }) });
}

function visibility(a, b) {
  const start = (b.source.x - a.source.x) * a.x + (b.source.y - a.source.y) * a.y;
  const end = (b.target.x - a.source.x) * a.x + (b.target.y - a.source.y) * a.y;
  const span = Math.abs(end - start);
  return span <= FDEB_EPSILON ? 0 : Math.max(0, 1 - 2 * Math.abs(a.length / 2 - (start + end) / 2) / span);
}

// Metrics are prepared once, then reused across the bounded candidate pairs.
export function forceCompatibility(a, b, directed) {
  if (typeof directed !== "boolean") throw new TypeError("Force compatibility requires explicit graph direction.");
  if (a.length <= FDEB_EPSILON || b.length <= FDEB_EPSILON) return Object.freeze({ angle: 0, scale: 0, position: 0, visibility: 0, compatibility: 0, reverse: false });
  const dot = a.x * b.x + a.y * b.y, mean = (a.length + b.length) / 2;
  const angle = Math.min(1, Math.abs(dot));
  const scale = 2 / (mean / Math.min(a.length, b.length) + Math.max(a.length, b.length) / mean);
  const position = mean / (mean + Math.hypot(a.midpoint.x - b.midpoint.x, a.midpoint.y - b.midpoint.y));
  const visible = Math.min(visibility(a, b), visibility(b, a));
  const compatibility = directed && dot < 0 ? 0 : angle * scale * position * visible;
  if (![angle, scale, position, visible, compatibility].every(Number.isFinite)) throw new RangeError("Force compatibility factors must be finite.");
  return Object.freeze({ angle, scale, position, visibility: visible, compatibility, reverse: !directed && dot < 0 });
}
