import { cloneAndFreeze, isOwned, isPlainObject } from "../core/immutable.js";

const normalizedShapes = new WeakMap();
const MAX_VERTICES = 1024;
const MAX_COORDINATE = 1_000_000;

export function pointPolygonArea(points) {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index], next = points[(index + 1) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(twiceArea) / 2;
}

function samePoint(a, b) {
  return a.x === b.x && a.y === b.y;
}

function turn(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a, b, p) {
  return p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) &&
    p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
}

function intersects(a, b, c, d) {
  const abC = turn(a, b, c), abD = turn(a, b, d);
  const cdA = turn(c, d, a), cdB = turn(c, d, b);
  return (Math.sign(abC) * Math.sign(abD) < 0 && Math.sign(cdA) * Math.sign(cdB) < 0) ||
    (abC === 0 && onSegment(a, b, c)) || (abD === 0 && onSegment(a, b, d)) ||
    (cdA === 0 && onSegment(c, d, a)) || (cdB === 0 && onSegment(c, d, b));
}

export function normalizePointPolygon(shape) {
  if (isOwned(shape) && normalizedShapes.has(shape)) return normalizedShapes.get(shape);
  if (!isPlainObject(shape) || !Object.hasOwn(shape, "polygon") ||
      Object.keys(shape).some(key => !["polygon", "normalization"].includes(key)) ||
      !Array.isArray(shape.polygon) || shape.polygon.length < 3 || shape.polygon.length > MAX_VERTICES + 1) {
    throw new TypeError("Point polygon requires a polygon array of 3 to 1024 vertices and optional normalization.");
  }
  if (Object.hasOwn(shape, "normalization") && !["area", "radius"].includes(shape.normalization)) {
    throw new Error('Point polygon normalization must be "area" or "radius".');
  }
  for (const point of shape.polygon) {
    if (!isPlainObject(point) || Object.keys(point).length !== 2 ||
        !Object.hasOwn(point, "x") || !Object.hasOwn(point, "y") ||
        ![point.x, point.y].every(value => Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE)) {
      throw new TypeError("Point polygon vertices require finite x/y coordinates with magnitude at most 1000000.");
    }
  }
  const points = samePoint(shape.polygon[0], shape.polygon.at(-1))
    ? shape.polygon.slice(0, -1) : shape.polygon;
  if (points.length < 3 || points.length > MAX_VERTICES) {
    throw new RangeError("Point polygon requires 3 to 1024 vertices after closing-point normalization.");
  }
  const area = pointPolygonArea(points);
  if (!Number.isFinite(area) || area <= 0) {
    throw new RangeError("Point polygon must have positive finite area.");
  }
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i], b = points[(i + 1) % points.length], c = points[(i + 2) % points.length];
    if (samePoint(a, b) || (turn(a, b, c) === 0 &&
        (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y) < 0)) {
      throw new Error("Point polygon edges must not be empty or backtrack.");
    }
    for (let j = i + 1; j < points.length; j += 1) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      if (intersects(a, b, points[j], points[(j + 1) % points.length])) {
        throw new Error("Point polygon must be simple, without crossing or touching nonadjacent edges.");
      }
    }
  }
  const normalized = cloneAndFreeze({ polygon: points,
    ...(Object.hasOwn(shape, "normalization") ? { normalization: shape.normalization } : {}) });
  normalizedShapes.set(normalized, normalized);
  if (isOwned(shape)) normalizedShapes.set(shape, normalized);
  return normalized;
}
