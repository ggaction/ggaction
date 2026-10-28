import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { interpolateNumber } from "./numeric.js";
import { pathFillContains, segmentDistance } from "./pathGeometry.js";
import { resolveStrokeDetails } from "./strokeStyle.js";

export const MAX_HIT_STROKE_WORK = 1_000_000;
const EPSILON = Number.EPSILON * 64;
const prepared = new WeakSet();
const same = (a, b) => a.x === b.x && a.y === b.y;

function point(value) {
  ownRecord(value, "Stroke point");
  if (Object.keys(value).length !== 2 || !Object.hasOwn(value, "x") || !Object.hasOwn(value, "y") ||
      !Number.isFinite(value.x) || !Number.isFinite(value.y)) throw new TypeError("Stroke point requires finite x/y.");
}
function spend(work, count = 1) {
  work.value += count;
  if (!Number.isSafeInteger(work.value) || work.value > MAX_HIT_STROKE_WORK) throw new RangeError("Hit stroke exceeds its work budget.");
}
function direction(a, b) {
  const x = b.x - a.x, y = b.y - a.y, length = Math.hypot(x, y);
  if (!Number.isFinite(length)) throw new RangeError("Hit stroke length must be finite.");
  return length === 0 ? undefined : { x: x / length, y: y / length, length };
}

function normalizeStroke(input) {
  ownRecord(input, "Hit stroke");
  if (Object.keys(input).some(key => !["width", "dash", "lineCap", "lineJoin", "miterLimit"].includes(key)) ||
      !Object.hasOwn(input, "width") || !Number.isFinite(input.width) || input.width < 0) {
    throw new TypeError("Hit stroke requires non-negative finite width and supported stroke options.");
  }
  const values = Object.assign(Object.create(null), input);
  const details = resolveStrokeDetails(values), dash = Object.hasOwn(values, "dash") ? values.dash : [];
  if (!Array.isArray(dash) || dash.length > 1024) throw new RangeError("Hit stroke dash requires at most 1024 entries.");
  ownArray(dash, "Hit stroke dash");
  if (dash.some(value => !Number.isFinite(value) || value < 0)) throw new TypeError("Hit stroke dash requires non-negative finite values.");
  const pattern = dash.length % 2 ? [...dash, ...dash] : [...dash];
  const cycle = pattern.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(cycle)) throw new RangeError("Hit stroke dash cycle must be finite.");
  return { width: values.width, ...details, pattern: cycle === 0 ? [] : pattern, cycle };
}

function normalizeGeometry(geometry, work) {
  ownRecord(geometry, "Flattened stroke geometry");
  if (Object.hasOwn(geometry, "diagnostics")) {
    ownArray(geometry.diagnostics, "Stroke geometry diagnostics");
    if (geometry.diagnostics.length) throw new RangeError("Hit stroke cannot consume incomplete path geometry.");
  }
  const subpaths = Object.getOwnPropertyDescriptor(geometry, "subpaths")?.value;
  if (!Array.isArray(subpaths) || subpaths.length > MAX_HIT_STROKE_WORK) throw new RangeError("Hit stroke subpaths exceed the work budget.");
  ownArray(subpaths, "Hit stroke subpaths");
  return subpaths.map(subpath => {
    ownRecord(subpath, "Hit stroke subpath");
    if (!Object.hasOwn(subpath, "points") || !Object.hasOwn(subpath, "closed") || !Object.hasOwn(subpath, "hasSegments") ||
        typeof subpath.closed !== "boolean" || typeof subpath.hasSegments !== "boolean" ||
        !Array.isArray(subpath.points) || subpath.points.length === 0) throw new TypeError("Hit stroke requires resolved nonempty subpaths.");
    spend(work, subpath.points.length);
    ownArray(subpath.points, "Hit stroke points");
    subpath.points.forEach(point);
    const points = subpath.points.filter((value, index) => index === 0 || !same(value, subpath.points[index - 1]));
    if (subpath.closed && !same(points[0], points.at(-1))) points.push(points[0]);
    return { points, closed: subpath.closed, hasSegments: subpath.hasSegments };
  });
}

function dashedRuns(subpath, style, work) {
  if (!subpath.hasSegments) return [];
  if (style.pattern.length === 0) return [subpath];
  const { pattern, cycle } = style, points = subpath.points;
  let length = 0;
  for (let i = 1; i < points.length; i++) length += direction(points[i - 1], points[i])?.length ?? 0;
  if (!Number.isFinite(length) || Math.ceil(length / cycle) * pattern.length > MAX_HIT_STROKE_WORK - work.value) {
    throw new RangeError("Hit stroke dash exceeds its work budget.");
  }
  const runs = [];
  let current, index = 0, remaining = pattern[0];
  const finish = () => { if (current !== undefined) { runs.push({ points: current, closed: false, hasSegments: true }); current = undefined; } };
  const advance = at => {
    while (remaining === 0) {
      spend(work);
      if (index % 2 === 0) {
        if (current === undefined) current = [at];
        finish();
      }
      index = (index + 1) % pattern.length; remaining = pattern[index];
    }
  };
  advance(points[0]);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], segment = direction(a, b);
    if (segment === undefined) continue;
    let position = 0, at = a;
    while (position < segment.length) {
      spend(work);
      const step = Math.min(remaining, segment.length - position), nextPosition = position + step;
      if (!(nextPosition > position)) throw new RangeError("Hit stroke dash cannot advance at this numeric precision.");
      const next = nextPosition >= segment.length ? b : {
        x: interpolateNumber(a.x, b.x, nextPosition / segment.length),
        y: interpolateNumber(a.y, b.y, nextPosition / segment.length)
      };
      if (index % 2 === 0) { current ??= [at]; current.push(next); }
      position = nextPosition; at = next; remaining -= step;
      advance(at);
    }
  }
  finish();
  if (points.length === 1 && index % 2 === 0 && runs.length === 0) runs.push({ points: [points[0]], closed: false, hasSegments: true });
  if (subpath.closed && runs.length > 1 && same(runs[0].points[0], points[0]) && same(runs.at(-1).points.at(-1), points[0])) {
    const last = runs.pop(); runs[0].points = [...last.points, ...runs[0].points.slice(1)];
  }
  if (subpath.closed && runs.length === 1 && runs[0].points.length > 1 && same(runs[0].points[0], runs[0].points.at(-1))) runs[0].closed = true;
  return runs;
}

function strokeParts(run, style, parts, work) {
  const half = style.width / 2, points = run.points.filter((value, index) => index === 0 || !same(value, run.points[index - 1]));
  const polygon = vertices => {
    spend(work, vertices.length); vertices.forEach(point);
    parts.push({ type: "polygon", points: vertices, commands: vertices.map((p, i) => ({ op: i ? "L" : "M", ...p })).concat({ op: "Z" }) });
  };
  const circle = center => {
    spend(work);
    if (![center.x - half, center.x + half, center.y - half, center.y + half].every(Number.isFinite)) throw new RangeError("Hit stroke bounds must be finite.");
    parts.push({ type: "circle", x: center.x, y: center.y, radius: half });
  };
  const shift = (p, d, along, normal) => ({ x: p.x + d.x * along - d.y * normal, y: p.y + d.y * along + d.x * normal });
  const directions = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], d = direction(a, b);
    if (d === undefined) continue;
    directions.push(d);
    polygon([shift(a, d, 0, half), shift(b, d, 0, half), shift(b, d, 0, -half), shift(a, d, 0, -half)]);
  }
  if (directions.length === 0) {
    if (style.lineCap === "round") circle(points[0]);
    if (style.lineCap === "square") polygon([{ x: points[0].x - half, y: points[0].y - half },
      { x: points[0].x + half, y: points[0].y - half }, { x: points[0].x + half, y: points[0].y + half },
      { x: points[0].x - half, y: points[0].y + half }]);
    return;
  }
  const cap = (p, d, sign) => {
    if (style.lineCap === "round") circle(p);
    if (style.lineCap === "square") polygon([shift(p, d, 0, half), shift(p, d, sign * half, half),
      shift(p, d, sign * half, -half), shift(p, d, 0, -half)]);
  };
  const join = (p, incoming, outgoing) => {
    if (style.lineJoin === "round") { circle(p); return; }
    const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
    if (Math.abs(cross) <= EPSILON) return;
    const sign = cross > 0 ? -1 : 1;
    const a = shift(p, incoming, 0, sign * half), b = shift(p, outgoing, 0, sign * half);
    const nx = -incoming.y - outgoing.y, ny = incoming.x + outgoing.x, norm = Math.hypot(nx, ny);
    const ratio = 2 / norm;
    if (style.lineJoin === "miter" && ratio <= style.miterLimit * (1 + EPSILON)) {
      const distance = half * ratio * sign / norm;
      polygon([p, a, { x: p.x + nx * distance, y: p.y + ny * distance }, b]);
    } else polygon([p, a, b]);
  };
  for (let i = 1; i < points.length - 1; i++) join(points[i], directions[i - 1], directions[i]);
  if (run.closed) join(points[0], directions.at(-1), directions[0]);
  else { cap(points[0], directions[0], -1); cap(points.at(-1), directions.at(-1), 1); }
}

/** Convert resolved flattened subpaths to the actual painted local stroke footprint. */
export function prepareHitStroke(geometry, input) {
  const work = { value: 0 }, style = normalizeStroke(input), subpaths = normalizeGeometry(geometry, work), parts = [];
  if (style.width > 0) for (const subpath of subpaths) {
    for (const run of dashedRuns(subpath, style, work)) strokeParts(run, style, parts, work);
  }
  const result = cloneAndFreeze(parts); prepared.add(result); return result;
}

/** Distance to painted stroke, so CSS slop can be applied without filling dash gaps. */
export function hitStrokeDistance(parts, query) {
  if (!prepared.has(parts)) throw new TypeError("Hit stroke requires its prepared parts.");
  point(query);
  let distance = Infinity;
  for (const part of parts) {
    if (part.type === "circle") distance = Math.min(distance, Math.max(0, Math.hypot(query.x - part.x, query.y - part.y) - part.radius));
    else if (pathFillContains(part.commands, query)) return 0;
    else for (let i = 0; i < part.points.length; i++) distance = Math.min(distance, segmentDistance(query, part.points[i], part.points[(i + 1) % part.points.length]));
  }
  return distance;
}
