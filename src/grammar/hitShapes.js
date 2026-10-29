import { clippedBoundaryDistance, clippedBoundaryPoint } from "./hitClipDistance.js";
import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { flattenPathCommands, pathFillContains, pathStrokeDistance, arcToCubicCommands, resolvePathCommandBounds } from "./pathGeometry.js";
import { validatePathCommands, validatePathFillRule, MAX_PATH_COMMANDS } from "./pathCommands.js";
import { resolveHitCoordinates, transformHitPoint } from "./hitCoordinates.js";
import { prepareHitStroke, MAX_HIT_STROKE_WORK } from "./hitStroke.js";

export const MAX_HIT_SHAPE_PARTS = 30_000;
export const MAX_HIT_CLIPS = 1024;
const identity = [1, 0, 0, 1, 0, 0];
const states = new WeakMap();

function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires exactly ${keys.join(", ")}.`);
  return value;
}
function rect(value) {
  exact(value, ["x", "y", "width", "height"], "Hit rectangle");
  if (!Object.values(value).every(Number.isFinite) || value.width < 0 || value.height < 0 ||
      !Number.isFinite(value.x + value.width) || !Number.isFinite(value.y + value.height)) throw new RangeError("Hit rectangle requires finite non-negative dimensions.");
  return value;
}
function rectCommands({ x, y, width, height }) {
  return [{ op: "M", x, y }, { op: "L", x: x + width, y }, { op: "L", x: x + width, y: y + height }, { op: "L", x, y: y + height }, { op: "Z" }];
}
function geometry(value) {
  ownRecord(value, "Hit geometry");
  if (!Object.hasOwn(value, "type")) throw new TypeError("Hit geometry requires a type.");
  if (value.type === "rect" || value.type === "image") {
    exact(value, ["type", "rect"], "Rectangular hit geometry"); rect(value.rect);
    return { paths: [rectCommands(value.rect)], fillRule: "nonzero" };
  }
  if (value.type === "text") {
    exact(value, ["type", "boxes"], "Text hit geometry");
    if (!Array.isArray(value.boxes) || value.boxes.length > MAX_HIT_SHAPE_PARTS) throw new RangeError("Text hit boxes exceed their work budget.");
    ownArray(value.boxes, "Text hit boxes"); value.boxes.forEach(rect);
    return { paths: value.boxes.map(rectCommands), fillRule: "nonzero" };
  }
  if (value.type === "line") {
    exact(value, ["type", "from", "to"], "Line hit geometry");
    const from = transformHitPoint(identity, value.from), to = transformHitPoint(identity, value.to);
    return { paths: [[{ op: "M", ...from }, { op: "L", ...to }]], fillRule: "nonzero" };
  }
  if (value.type === "circle") {
    exact(value, ["type", "x", "y", "radius"], "Circle hit geometry");
    if (![value.x, value.y, value.radius].every(Number.isFinite) || value.radius < 0 ||
        ![value.x - value.radius, value.x + value.radius, value.y - value.radius, value.y + value.radius].every(Number.isFinite)) {
      throw new RangeError("Hit circle requires finite bounds and non-negative radius.");
    }
    return { circle: { x: value.x, y: value.y, radius: value.radius }, fillRule: "nonzero" };
  }
  if (value.type === "path") {
    exact(value, ["type", "commands", "fillRule"], "Path hit geometry");
    validatePathCommands(value.commands); validatePathFillRule(value.fillRule);
    return { paths: [value.commands], fillRule: value.fillRule };
  }
  throw new TypeError("Unsupported hit geometry type.");
}
function work(count, budget) {
  budget.value += count;
  if (budget.value > MAX_HIT_STROKE_WORK) throw new RangeError("Hit shape exceeds its geometry work budget.");
}
function requireComplete(value) {
  if (value.diagnostics.length) throw new RangeError("Hit shape cannot consume incomplete path geometry.");
  return value;
}
function flattenedCommands(flat) {
  const commands = [];
  for (const subpath of flat.subpaths) {
    for (let i = 0; i < subpath.points.length; i++) commands.push({ op: i ? "L" : "M", ...subpath.points[i] });
    if (subpath.closed) commands.push({ op: "Z" });
  }
  if (commands.length > MAX_PATH_COMMANDS) throw new RangeError("Hit path exceeds its prepared command budget.");
  return commands;
}
function circleCommands(circle, tolerance) {
  if (circle.radius === 0) return [{ op: "M", x: circle.x, y: circle.y }];
  return [...requireComplete(arcToCubicCommands({ centerX: circle.x, centerY: circle.y,
    radiusX: circle.radius, startAngle: 0, endAngle: 2 * Math.PI, tolerance })).commands, { op: "Z" }];
}
function compilePath(commands, transform, fillRule, budget) {
  const flat = requireComplete(flattenPathCommands(commands, { tolerance: 0.125, transform }));
  work(flat.subpaths.reduce((sum, item) => sum + item.points.length, 0), budget);
  const points = flattenedCommands(flat);
  return { commands: points, fillRule, bounds: resolvePathCommandBounds(points) };
}
function closeFillCommands(commands) {
  const closed = [];
  for (const command of commands) {
    if (command.op === "M" && closed.length && closed.at(-1).op !== "Z") closed.push({ op: "Z" });
    closed.push(command);
  }
  if (closed.length && closed.at(-1).op !== "Z") closed.push({ op: "Z" });
  return closed;
}
function compileGeometry(normalized, transform, tolerance, budget, close = false) {
  const paths = normalized.circle ? [circleCommands(normalized.circle, tolerance)] : normalized.paths;
  return paths.map(commands => ({ ...compilePath(close ? closeFillCommands(commands) : commands, transform, normalized.fillRule, budget),
    ...(normalized.circle ? { circle: normalized.circle, transform } : {}) }));
}
function toleranceFor(transform) {
  transformHitPoint(transform, { x: 0, y: 0 });
  const scale = Math.hypot(...transform.slice(0, 4)), tolerance = 0.125 / Math.max(1, scale);
  if (!Number.isFinite(scale) || !(tolerance > 0)) throw new RangeError("Hit transform exceeds finite geometry precision.");
  return tolerance;
}
function coordinate(point, transform) {
  return resolveHitCoordinates({ point, rect: { left: 0, top: 0, width: 1, height: 1 }, rootTransform: transform, childTransforms: [] });
}
function unionBounds(primitives) {
  let bounds = null;
  for (const part of primitives) {
    if (!part.bounds) continue;
    if (bounds === null) bounds = { ...part.bounds };
    else { bounds.left = Math.min(bounds.left, part.bounds.left); bounds.right = Math.max(bounds.right, part.bounds.right);
      bounds.top = Math.min(bounds.top, part.bounds.top); bounds.bottom = Math.max(bounds.bottom, part.bounds.bottom); }
  }
  return bounds;
}
function contains(part, point) {
  if (part.circle) {
    const local = coordinate(point, part.transform).localPoint;
    return local !== null && part.circle.radius > 0 && Math.hypot(local.x - part.circle.x, local.y - part.circle.y) <= part.circle.radius;
  }
  return pathFillContains(part.commands, point, { fillRule: part.fillRule });
}
function boundaryDistance(part, point) { return contains(part, point) ? 0 : pathStrokeDistance(part.commands, point); }

/** Prepare explicit geometry and paint footprints; text boxes are supplied by the metrics owner. */
export function prepareHitShape(input) {
  exact(input, ["geometry", "paint", "transform", "clips"], "Hit shape");
  const shape = geometry(input.geometry), paint = exact(input.paint, ["fill", "stroke", "opacity"], "Hit paint");
  if (typeof paint.fill !== "boolean" || !Number.isFinite(paint.opacity) || paint.opacity < 0 || paint.opacity > 1) throw new TypeError("Hit paint requires boolean fill and opacity from 0 to 1.");
  const tolerance = toleranceFor(input.transform), budget = { value: 0 };
  if (!Array.isArray(input.clips) || input.clips.length > MAX_HIT_CLIPS) throw new RangeError("Hit clips exceed their work budget.");
  ownArray(input.clips, "Hit clips");
  const clipInputs = input.clips.map(item => {
    exact(item, ["geometry", "transform"], "Hit clip");
    const clip = geometry(item.geometry), clipTolerance = toleranceFor(item.transform);
    if (!["rect", "path"].includes(item.geometry.type)) throw new TypeError("Hit clips require rect or path geometry.");
    return { normalized: clip, transform: item.transform, tolerance: clipTolerance };
  });
  const paths = shape.circle ? [circleCommands(shape.circle, tolerance)] : shape.paths;
  const strokeParts = [];
  if (paint.stroke !== null) {
    // Validate even an empty text geometry or invisible shape's stroke options.
    prepareHitStroke({ subpaths: [] }, paint.stroke);
    for (const commands of paths) {
      const flat = requireComplete(flattenPathCommands(commands, { tolerance }));
      const parts = prepareHitStroke(flat, paint.stroke);
      if (strokeParts.length + parts.length > MAX_HIT_SHAPE_PARTS) throw new RangeError("Hit stroke parts exceed their work budget.");
      strokeParts.push(...parts);
    }
  }
  const diagnostics = [coordinate({ x: 0, y: 0 }, input.transform),
    ...clipInputs.map(clip => coordinate({ x: 0, y: 0 }, clip.transform))].flatMap(result => result.diagnostics)
    .filter(diagnostic => diagnostic.code === "hit-transform-singular");
  const emptyFill = shape.circle?.radius === 0 || (["rect", "image"].includes(input.geometry.type) &&
    (input.geometry.rect.width === 0 || input.geometry.rect.height === 0));
  const fill = paint.fill && !emptyFill ? compileGeometry(shape, input.transform, tolerance, budget, true) : [];
  const strokes = strokeParts.map(part => compileGeometry(part.type === "circle"
    ? { circle: part, fillRule: "nonzero" } : { paths: [part.commands], fillRule: "nonzero" }, input.transform, tolerance, budget)[0]);
  const clips = clipInputs.map(clip => compileGeometry(clip.normalized, clip.transform, clip.tolerance, budget, true));
  let bounds = unionBounds([...fill, ...strokes]);
  if (bounds !== null) {
    // Include the shared subdivision tolerance in the broad phase only.
    bounds = { left: bounds.left - 0.25, right: bounds.right + 0.25, top: bounds.top - 0.25, bottom: bounds.bottom + 0.25 };
    if (!Object.values(bounds).every(Number.isFinite)) throw new RangeError("Hit bounds overflow.");
  }
  const result = cloneAndFreeze({ type: input.geometry.type, bounds, diagnostics });
  states.set(result, cloneAndFreeze({ fill, strokes, clips, opacity: paint.opacity, transform: input.transform,
    work: 1 + 4 * budget.value + fill.length + strokes.length + clips.length }));
  return result;
}

/** One item may contain several weighted concrete footprints. */
export function prepareHitShapeUnion(shapes) {
  ownArray(shapes, "Hit shape union");
  if (shapes.length < 2 || shapes.length > 64) throw new RangeError("Hit shape union requires 2..64 prepared parts.");
  let cost = 0;
  for (const shape of shapes) {
    const state = states.get(shape);
    if (!state || state.parts) throw new TypeError("Hit shape union requires flat prepared shapes.");
    cost += state.work;
    if (cost > MAX_HIT_STROKE_WORK) throw new RangeError("Hit shape union exceeds its geometry budget.");
  }
  const result = cloneAndFreeze({ type: "weighted-blend", bounds: unionBounds(shapes), diagnostics: shapes.flatMap(shape => shape.diagnostics) });
  states.set(result, { parts: [...shapes], work: cost });
  return result;
}

/** Conservative narrow-phase work, used by the bounded current-scene index. */
export function hitShapeWork(prepared) {
  const state = states.get(prepared);
  if (!state) throw new TypeError("Hit shape requires its prepared geometry.");
  return state.work;
}

export function normalizeHitQuery(options = {}) {
  ownRecord(options, "Hit query options");
  if (Object.keys(options).some(key => !["pointerType", "slop", "hitInvisible"].includes(key))) throw new TypeError("Unsupported hit query option.");
  const request = Object.assign(Object.create(null), options);
  const pointerType = request.pointerType === undefined ? "mouse" : request.pointerType;
  const slop = request.slop === undefined ? pointerType === "touch" ? 6 : 3 : request.slop;
  const hitInvisible = request.hitInvisible === undefined ? false : request.hitInvisible;
  if (!["mouse", "pen", "touch"].includes(pointerType) || !Number.isFinite(slop) || slop < 0 || typeof hitInvisible !== "boolean") throw new TypeError("Hit query requires a pointer type, finite non-negative slop and boolean hitInvisible.");
  return freezeOwned({ pointerType, slop, hitInvisible });
}

function queryShape(prepared, point, options, nearest, spend) {
  const budget = { value: 0 };
  spend ??= count => work(count, budget);
  const state = states.get(prepared);
  if (!state) throw new TypeError("Hit shape requires its prepared geometry.");
  transformHitPoint(identity, point);
  const query = normalizeHitQuery(options);
  if (state.parts) {
    const results = state.parts.map(part => queryShape(part, point, query, nearest, spend));
    const hits = results.filter(result => result.hit).sort((a, b) => a.distance - b.distance);
    if (hits.length) return hits[0];
    return freezeOwned({ hit: false, distance: Math.min(...results.map(result => result.distance)), localPoint: null, diagnostics: prepared.diagnostics });
  }
  let distance = Infinity, hit = false;
  if (prepared.diagnostics.length === 0 && (state.opacity > 0 || query.hitInvisible) &&
      state.clips.every(parts => parts.some(part => contains(part, point)))) {
    hit = state.fill.some(part => contains(part, point));
    if (hit) distance = 0;
    else for (const part of nearest ? [...state.fill, ...state.strokes] : state.strokes) {
      const value = nearest && state.clips.length && !contains(part, point) ? clippedBoundaryDistance(part, state.clips, point, spend) : boundaryDistance(part, point);
      distance = Math.min(distance, value);
    }
    hit ||= distance <= query.slop;
  }
  const mapped = hit ? coordinate(point, state.transform) : null;
  return freezeOwned({ hit: hit && mapped.localPoint !== null, distance, localPoint: mapped?.localPoint ?? null,
    diagnostics: mapped?.diagnostics.length ? mapped.diagnostics : prepared.diagnostics });
}

export function hitShape(prepared, point, options = {}) { return queryShape(prepared, point, options, false); }

// Reuse painted footprints and clip admission, but include distance to fill edges.
export function nearestHitShape(prepared, point, options, spend) { return queryShape(prepared, point, options, true, spend); }


// Circle fill membership is analytic, so split a clip edge at its analytic
// circle crossings as well as the existing flattened path crossings.
function circleCuts(part, edge) {
  const [a, b] = edge.map(point => coordinate(point, part.transform).localPoint);
  if (a === null || b === null) return [];
  const { x, y, radius } = part.circle;
  const scale = Math.max(Math.abs(a.x), Math.abs(a.y), Math.abs(b.x), Math.abs(b.y), Math.abs(x), Math.abs(y), radius, 1);
  const ax = a.x / scale - x / scale, ay = a.y / scale - y / scale;
  const dx = b.x / scale - a.x / scale, dy = b.y / scale - a.y / scale, r = radius / scale;
  const length = Math.hypot(dx, dy);
  if (!(length > 0)) return [];
  const ux = dx / length, uy = dy / length, along = -(ax * ux + ay * uy);
  const away = Math.abs(ax * uy - ay * ux);
  if (away > r) return [];
  const delta = Math.sqrt(Math.max(0, (r - away) * (r + away)));
  return [(along - delta) / length, (along + delta) / length].filter(t => t >= 0 && t <= 1);
}

/** Private CSS-space focus anchor, admitted by the exact current hit owner. */
export function hitShapeAnchor(prepared, spend) {
  const state = states.get(prepared);
  if (!state) throw new TypeError("Hit shape requires its prepared geometry.");
  const budget = { value: 0 }; spend ??= count => work(count, budget);
  spend(state.work);
  if (prepared.diagnostics.length || state.opacity === 0) return null;
  const inClips = point => state.clips.every(parts => parts.some(part => contains(part, point)));
  for (const part of [...state.fill, ...state.strokes]) {
    const admit = point => { spend(state.work); return contains(part, point) && inClips(point); };
    if (part.circle) {
      const center = transformHitPoint(part.transform, { x: part.circle.x, y: part.circle.y });
      if (admit(center)) return freezeOwned(center);
    }
    let point = clippedBoundaryPoint(part, state.clips, admit, spend);
    if (point !== null) return freezeOwned(point);
    // A clip can be wholly inside paint, or several clips can intersect away
    // from the paint boundary. Their admitted boundaries then supply the point.
    for (let index = 0; index < state.clips.length; index++) for (const clip of state.clips[index]) {
      const others = state.clips.filter((_, i) => i !== index);
      if (!part.circle) others.push([part]);
      point = clippedBoundaryPoint(clip, others, admit, spend, part.circle ? edge => circleCuts(part, edge) : undefined);
      if (point !== null) return freezeOwned(point);
    }
  }
  return null;
}
