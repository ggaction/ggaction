import { flattenPathCommands, pathFillContains, segmentDistance } from "./pathGeometry.js";
import { interpolateNumber } from "./numeric.js";

function segments(commands) {
  const result = [];
  for (const path of flattenPathCommands(commands).subpaths) {
    for (let index = 1; index < path.points.length; index++) result.push([path.points[index - 1], path.points[index]]);
    if (path.closed && path.points.length > 1) result.push([path.points.at(-1), path.points[0]]);
  }
  return result;
}
const cross = (a, b) => a.x * b.y - a.y * b.x;
const between = value => value >= 0 && value <= 1;
function crossing([a, b], [c, d]) {
  // Normalize before differences/products so extreme finite CSS coordinates do not overflow.
  const scale = Math.max(...[a, b, c, d].flatMap(point => [Math.abs(point.x), Math.abs(point.y)]), 1);
  const difference = (p, q) => ({ x: p.x / scale - q.x / scale, y: p.y / scale - q.y / scale });
  const r = difference(b, a), s = difference(d, c), q = difference(c, a), denominator = cross(r, s);
  if (denominator !== 0) {
    const t = cross(q, s) / denominator, u = cross(q, r) / denominator;
    return between(t) && between(u) ? [t] : [];
  }
  if (cross(q, r) !== 0) return [];
  const axis = Math.abs(r.x) >= Math.abs(r.y) ? "x" : "y";
  if (r[axis] === 0) return [];
  return [q[axis] / r[axis], difference(d, a)[axis] / r[axis]].filter(between);
}
const pointAt = ([a, b], t) => ({ x: interpolateNumber(a.x, b.x, t), y: interpolateNumber(a.y, b.y, t) });

// Inputs are the geometry owner's already validated flattened footprints. Split
// only painted boundaries; clip boundaries can enter paint only at these crossings.
function visitClippedBoundary(part, clips, spend, visit, extraCuts) {
  const edgeCount = part.commands.length + clips.reduce((sum, parts) => sum + parts.reduce((total, clip) => total + clip.commands.length, 0), 0);
  spend(edgeCount);
  const boundaries = clips.flatMap(parts => parts.flatMap(clip => segments(clip.commands)));
  const admitted = point => {
    spend(edgeCount);
    return clips.every(parts => parts.some(clip => pathFillContains(clip.commands, point, { fillRule: clip.fillRule })));
  };
  for (const edge of segments(part.commands)) {
    const cuts = [0, 1, ...(extraCuts?.(edge) ?? [])];
    for (const boundary of boundaries) { spend(1); cuts.push(...crossing(edge, boundary)); }
    cuts.sort((a, b) => { spend(1); return a - b; });
    for (let index = 0; index < cuts.length; index++) {
      const start = pointAt(edge, cuts[index]);
      if (admitted(start) && visit(start, start)) return true;
      if (index === 0 || cuts[index] === cuts[index - 1]) continue;
      if (admitted(pointAt(edge, (cuts[index] + cuts[index - 1]) / 2))) {
        if (visit(pointAt(edge, cuts[index - 1]), start)) return true;
      }
    }
  }
  return false;
}

export function clippedBoundaryDistance(part, clips, point, spend) {
  let distance = Infinity;
  visitClippedBoundary(part, clips, spend, (from, to) => {
    distance = Math.min(distance, segmentDistance(point, from, to));
    return false;
  });
  return distance;
}

// Reuse the same clipped boundary subdivision for an admitted focus point.
// The predicate owns exact paint membership; no bounds-centre approximation.
export function clippedBoundaryPoint(part, clips, admit, spend, extraCuts) {
  let result = null;
  visitClippedBoundary(part, clips, spend, (from, to) => {
    const middle = pointAt([from, to], 0.5);
    for (const point of [middle, from, to]) if (admit(point)) { result = point; return true; }
    return false;
  }, extraCuts);
  return result;
}
