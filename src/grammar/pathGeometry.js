import { freezeOwned, isOwned } from "../core/immutable.js";
import { interpolateNumber } from "./numeric.js";
import { resolvePathSubpaths, validatePathFillRule, MAX_PATH_COMMANDS } from "./pathTopology.js";

const EPSILON = Number.EPSILON * 64;
const pathBounds = new WeakMap();

function includeExtent(result, left, right, top, bottom) {
  if (result === undefined) return { left, right, top, bottom };
  result.left = Math.min(result.left, left);
  result.right = Math.max(result.right, right);
  result.top = Math.min(result.top, top);
  result.bottom = Math.max(result.bottom, bottom);
  return result;
}

function cubicValue(start, control1, control2, end, t) {
  const remaining = 1 - t;
  if (Math.max(
    Math.abs(start),
    Math.abs(control1),
    Math.abs(control2),
    Math.abs(end)
  ) <= Number.MAX_VALUE / 4) {
    return remaining ** 3 * start +
      3 * remaining ** 2 * t * control1 +
      3 * remaining * t ** 2 * control2 +
      t ** 3 * end;
  }
  const left = interpolateNumber(start, control1, t);
  const middle = interpolateNumber(control1, control2, t);
  const right = interpolateNumber(control2, end, t);
  return interpolateNumber(
    interpolateNumber(left, middle, t),
    interpolateNumber(middle, right, t),
    t
  );
}

function cubicExtrema(start, control1, control2, end) {
  let scale = Math.max(
    Math.abs(start),
    Math.abs(control1),
    Math.abs(control2),
    Math.abs(end)
  );
  const normalizeCoordinates = scale > Number.MAX_VALUE / 24 ||
    (scale > 0 && scale < EPSILON);
  if (normalizeCoordinates) {
    start /= scale;
    control1 /= scale;
    control2 /= scale;
    end /= scale;
  }
  let quadratic = 3 * (-start + 3 * control1 - 3 * control2 + end);
  let linear = 2 * (3 * start - 6 * control1 + 3 * control2);
  let constant = 3 * (control1 - start);
  scale = Math.max(
    Math.abs(quadratic),
    Math.abs(linear),
    Math.abs(constant)
  );
  let epsilon = EPSILON * Math.max(normalizeCoordinates ? 0 : 1, scale);
  if (scale > Math.sqrt(Number.MAX_VALUE) / 2) {
    quadratic /= scale;
    linear /= scale;
    constant /= scale;
    epsilon = EPSILON;
  }
  if (Math.abs(quadratic) <= epsilon) {
    if (Math.abs(linear) <= epsilon) return [];
    const root = -constant / linear;
    return root > 0 && root < 1 ? [root] : [];
  }
  const discriminant = linear ** 2 - 4 * quadratic * constant;
  if (discriminant < -epsilon) return [];
  const root = Math.sqrt(Math.max(0, discriminant));
  return [
    (-linear - root) / (2 * quadratic),
    (-linear + root) / (2 * quadratic)
  ].filter(value => value > 0 && value < 1);
}

export function resolvePathCommandBounds(commands) {
  if (pathBounds.has(commands)) {
    const cached = pathBounds.get(commands);
    return cached === undefined ? undefined : { ...cached };
  }
  let bounds;
  let current;
  for (const command of commands) {
    if (command.op === "M" || command.op === "L") {
      if ([command.x, command.y].every(Number.isFinite)) {
        current = { x: command.x, y: command.y };
        bounds = includeExtent(
          bounds, current.x, current.x, current.y, current.y
        );
      }
      continue;
    }
    if (command.op !== "C" || current === undefined) continue;
    if (![command.x1, command.y1, command.x2, command.y2, command.x, command.y]
      .every(Number.isFinite)) continue;
    const roots = new Set([
      0,
      1,
      ...cubicExtrema(current.x, command.x1, command.x2, command.x),
      ...cubicExtrema(current.y, command.y1, command.y2, command.y)
    ]);
    for (const t of roots) {
      const x = cubicValue(current.x, command.x1, command.x2, command.x, t);
      const y = cubicValue(current.y, command.y1, command.y2, command.y, t);
      bounds = includeExtent(
        bounds,
        x,
        x,
        y,
        y
      );
    }
    current = { x: command.x, y: command.y };
  }
  if (isOwned(commands)) pathBounds.set(commands, bounds);
  return bounds === undefined ? undefined : { ...bounds };
}


const MAX_FLATTENED_POINTS = 1_000_000;
const point = (x, y) => ({ x, y });
const midpoint = (a, b) => {
  const result = point(interpolateNumber(a.x, b.x, 0.5), interpolateNumber(a.y, b.y, 0.5));
  if (a.width !== undefined) result.width = interpolateNumber(a.width, b.width, 0.5);
  return result;
};

export function segmentDistance(query, from, to) {
  const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
  if (!Number.isFinite(length)) throw new RangeError("Path segment distance is not finite.");
  if (length === 0) return Math.hypot(query.x - from.x, query.y - from.y);
  const along = Math.max(0, Math.min(length, (query.x - from.x) * (dx / length) + (query.y - from.y) * (dy / length)));
  return Math.hypot(query.x - from.x - along * (dx / length), query.y - from.y - along * (dy / length));
}

function geometryOptions(tolerance, maxDepth) {
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new RangeError("Path tolerance must be positive and finite.");
  if (!Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 20) throw new RangeError("Path maxDepth must be an integer from 0 to 20.");
}

// Input is transformed to scene CSS pixels before measuring subdivision error.
export function flattenPathCommands(commands, options) {
  return flattenCommands(commands, options);
}

// Private Trail bridge: width uses the same curve parameter and subdivision as
// XY. Its control-polygon deviation from linear width also bounds refinement.
export function flattenVariableWidthPath(commands, widthCommands, options) {
  resolvePathSubpaths(commands); resolvePathSubpaths(widthCommands);
  if (commands.length !== widthCommands.length || commands.some((command, index) => command.op !== widthCommands[index].op)) {
    throw new TypeError("Variable-width paths require matching command topology.");
  }
  const bounds = resolvePathCommandBounds(widthCommands);
  if (!Number.isFinite(bounds.top) || bounds.top < 0 || !Number.isFinite(bounds.bottom)) {
    throw new RangeError("Variable-width path curves must remain finite and nonnegative.");
  }
  return flattenCommands(commands, options, widthCommands);
}

function flattenCommands(commands, { tolerance = 0.25, maxDepth = 20, maxPoints = MAX_FLATTENED_POINTS, transform = [1, 0, 0, 1, 0, 0] } = {}, widthCommands) {
  geometryOptions(tolerance, maxDepth);
  if (!Number.isSafeInteger(maxPoints) || maxPoints < 1 || maxPoints > MAX_FLATTENED_POINTS) throw new RangeError("Path maxPoints must be an integer from 1 to 1000000.");
  if (!Array.isArray(transform) || transform.length !== 6 || !transform.every(Number.isFinite)) throw new TypeError("Path transform requires six finite numbers.");
  const map = (x, y, width) => {
    const [a, b, c, d, e, f] = transform, result = point(a * x + c * y + e, b * x + d * y + f);
    if (width !== undefined) result.width = width;
    if (![result.x, result.y].every(Number.isFinite)) throw new RangeError("Transformed path coordinates must be finite.");
    return result;
  };
  const subpaths = [], diagnostics = [];
  let pointCount = 0;
  const pointLimit = commandIndex => freezeOwned({ subpaths: freezeOwned([]), diagnostics: freezeOwned([freezeOwned({ code: "path-point-limit", limit: maxPoints, commandIndex })]) });
  for (const { start, end, closed } of resolvePathSubpaths(commands)) {
    const first = map(commands[start].x, commands[start].y, widthCommands?.[start].y), points = [first];
    let current = first, hasSegments = false;
    pointCount++;
    if (pointCount > maxPoints) return pointLimit(start);
    const append = value => { points.push(value); pointCount++; };
    for (let index = start + 1; index <= end; index++) {
      const command = commands[index];
      if (command.op === "Z") { hasSegments = true; append(first); if (pointCount > maxPoints) return pointLimit(index); continue; }
      hasSegments = true;
      const to = map(command.x, command.y, widthCommands?.[index].y);
      if (command.op === "L") append(to);
      else {
        const stack = [{ points: [current, map(command.x1, command.y1, widthCommands?.[index].y1), map(command.x2, command.y2, widthCommands?.[index].y2), to], depth: 0 }];
        while (stack.length) {
          const { points: [p0, p1, p2, p3], depth } = stack.pop();
          const widthError = widthCommands === undefined ? 0 : Math.max(
            Math.abs(p1.width - interpolateNumber(p0.width, p3.width, 1 / 3)),
            Math.abs(p2.width - interpolateNumber(p0.width, p3.width, 2 / 3)));
          const error = Math.max(segmentDistance(p1, p0, p3), segmentDistance(p2, p0, p3), widthError);
          if (error <= tolerance || depth === maxDepth) {
            if (error > tolerance) diagnostics.push({ code: "path-subdivision-limit", commandIndex: index, maxDepth, error, tolerance });
            append(p3);
          } else {
            const a = midpoint(p0, p1), b = midpoint(p1, p2), c = midpoint(p2, p3);
            const d = midpoint(a, b), e = midpoint(b, c), middle = midpoint(d, e);
            stack.push({ points: [middle, e, c, p3], depth: depth + 1 }, { points: [p0, a, d, middle], depth: depth + 1 });
          }
          if (pointCount > maxPoints) return pointLimit(index);
        }
      }
      if (pointCount > maxPoints) return pointLimit(index);
      current = to;
    }
    subpaths.push(freezeOwned({ closed, hasSegments, points: freezeOwned(points.map(value => freezeOwned(value))) }));
  }
  return freezeOwned({ subpaths: freezeOwned(subpaths), diagnostics: freezeOwned(diagnostics.map(value => freezeOwned(value))) });
}

function requireFlattened(commands, options) {
  const geometry = flattenPathCommands(commands, options);
  if (geometry.diagnostics.length) {
    const error = new RangeError("Path geometry exceeded its subdivision budget.");
    error.diagnostics = geometry.diagnostics;
    throw error;
  }
  return geometry;
}
function requirePoint(query) {
  if (!query || ![query.x, query.y].every(Number.isFinite)) throw new TypeError("Path query requires a finite point.");
}

export function pathFillContains(commands, query, { fillRule = "nonzero", ...options } = {}) {
  requirePoint(query); validatePathFillRule(fillRule);
  let winding = 0, crossings = 0;
  for (const { points } of requireFlattened(commands, options).subpaths) {
    const origin = points[0], distinct = points.find(p => p.x !== origin.x || p.y !== origin.y);
    if (!distinct || !points.some(p => {
      const scale = Math.max(Number.MIN_VALUE, Math.abs(origin.x), Math.abs(origin.y), Math.abs(distinct.x), Math.abs(distinct.y), Math.abs(p.x), Math.abs(p.y));
      return (distinct.x / scale - origin.x / scale) * (p.y / scale - origin.y / scale) !==
        (distinct.y / scale - origin.y / scale) * (p.x / scale - origin.x / scale);
    })) continue;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if (segmentDistance(query, a, b) === 0) return true;
      if ((a.y > query.y) !== (b.y > query.y)) {
        const x = interpolateNumber(a.x, b.x, (query.y - a.y) / (b.y - a.y));
        if (x > query.x) { crossings++; winding += b.y > a.y ? 1 : -1; }
      }
    }
  }
  return fillRule === "evenodd" ? crossings % 2 === 1 : winding !== 0;
}

export function pathStrokeDistance(commands, query, options) {
  requirePoint(query);
  let distance = Infinity;
  for (const { points, hasSegments } of requireFlattened(commands, options).subpaths) {
    if (!hasSegments) continue;
    for (let i = 1; i < points.length; i++) distance = Math.min(distance, segmentDistance(query, points[i - 1], points[i]));
  }
  return distance;
}

export const arcControlFactor = delta => 4 / 3 * Math.tan(delta / 4);

export function arcToCubicCommands({ centerX, centerY, radiusX, radiusY = radiusX, startAngle, endAngle, rotation = 0, tolerance = 0.25, maxDepth = 20 }) {
  geometryOptions(tolerance, maxDepth);
  if (![centerX, centerY, radiusX, radiusY, startAngle, endAngle, rotation].every(Number.isFinite) || radiusX <= 0 || radiusY <= 0) throw new RangeError("Arc requires finite geometry and positive radii.");
  const cosine = Math.cos(rotation), sine = Math.sin(rotation);
  const map = (x, y) => point(centerX + cosine * radiusX * x - sine * radiusY * y, centerY + sine * radiusX * x + cosine * radiusY * y);
  const first = map(Math.cos(startAngle), Math.sin(startAngle)), commands = [{ op: "M", ...first }], diagnostics = [];
  if (![first.x, first.y].every(Number.isFinite)) throw new RangeError("Arc coordinates must be finite.");
  const count = Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 2));
  if (!Number.isFinite(count) || count >= MAX_PATH_COMMANDS) throw new RangeError("Arc exceeds the path command limit.");
  const append = (start, end, depth) => {
    const delta = end - start, factor = arcControlFactor(delta);
    const p0 = map(Math.cos(start), Math.sin(start)), p3 = map(Math.cos(end), Math.sin(end));
    const p1 = map(Math.cos(start) - factor * Math.sin(start), Math.sin(start) + factor * Math.cos(start));
    const p2 = map(Math.cos(end) + factor * Math.sin(end), Math.sin(end) - factor * Math.cos(end));
    // Bound both curves against the same linearly parameterized chord. The arc
    // interpolation error is bounded by max|second derivative| * delta² / 8.
    const chord = t => point(interpolateNumber(p0.x, p3.x, t), interpolateNumber(p0.y, p3.y, t));
    const a = chord(1 / 3), b = chord(2 / 3);
    const error = Math.max(radiusX, radiusY) * delta ** 2 / 8 + Math.max(Math.hypot(p1.x - a.x, p1.y - a.y), Math.hypot(p2.x - b.x, p2.y - b.y));
    if (error > tolerance && depth < maxDepth) {
      const middle = interpolateNumber(start, end, 0.5);
      append(start, middle, depth + 1); append(middle, end, depth + 1); return;
    }
    if (error > tolerance) diagnostics.push(freezeOwned({ code: "arc-subdivision-limit", maxDepth, error, tolerance }));
    if (commands.length >= MAX_PATH_COMMANDS) throw new RangeError("Arc exceeds the path command limit.");
    const command = { op: "C", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p3.x, y: p3.y };
    if (!Object.values(command).slice(1).every(Number.isFinite)) throw new RangeError("Arc coordinates must be finite.");
    commands.push(freezeOwned(command));
  };
  for (let i = 0; i < count; i++) append(interpolateNumber(startAngle, endAngle, i / count), interpolateNumber(startAngle, endAngle, (i + 1) / count), 0);
  return freezeOwned({ commands: freezeOwned(commands.map(value => freezeOwned(value))), diagnostics: freezeOwned(diagnostics) });
}
