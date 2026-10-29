import { validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";

function comparePoint(a, b) {
  return a.x - b.x || a.y - b.y || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function ringArea(points) {
  const origin = points[0];
  let twice = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const a = points[index], b = points[index + 1];
    twice += (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
  }
  return twice / 2;
}

function contains(ring, point) {
  let inside = false;
  for (let index = 1; index < ring.length; index += 1) {
    const a = ring[index - 1], b = ring[index];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// Opposite cell boundaries cancel. The remaining directed edges keep the
// occupied region on their right in the grid's downward-positive y convention.
export function stitchGridRings(segments, grid) {
  const edges = new Map();
  for (const [a, b] of segments) {
    if (a.id === b.id || a.x === b.x && a.y === b.y) continue;
    const key = `${a.id}|${b.id}`, reverse = `${b.id}|${a.id}`;
    if (edges.has(reverse)) edges.delete(reverse);
    else edges.set(key, { a, b, key });
  }
  validateGeneratedItemLimit(edges.size, "Grid boundary segment count");
  const outgoing = new Map();
  for (const edge of edges.values()) {
    if (!outgoing.has(edge.a.id)) outgoing.set(edge.a.id, []);
    outgoing.get(edge.a.id).push(edge);
  }
  const ordered = [...edges.values()].sort((a, b) => comparePoint(a.a, b.a) || comparePoint(a.b, b.b));
  const visited = new Set(), rings = [];
  for (const first of ordered) {
    if (visited.has(first.key)) continue;
    const points = [first.a];
    let edge = first;
    while (true) {
      visited.add(edge.key);
      points.push(edge.b);
      if (edge.b.id === first.a.id) break;
      const candidates = (outgoing.get(edge.b.id) ?? []).filter(candidate => !visited.has(candidate.key));
      if (!candidates.length) throw new Error("Grid boundary must form closed rings.");
      const dx = edge.b.x - edge.a.x, dy = edge.b.y - edge.a.y;
      const turn = candidate => Math.atan2(dx * (candidate.b.y - candidate.a.y) - dy * (candidate.b.x - candidate.a.x),
        dx * (candidate.b.x - candidate.a.x) + dy * (candidate.b.y - candidate.a.y));
      // At a touching vertex the greatest right turn keeps islands separate.
      candidates.sort((a, b) => turn(b) - turn(a) || comparePoint(a.b, b.b));
      [edge] = candidates;
    }
    const area = ringArea(points);
    // The first unused sorted edge already gives each ring its canonical start.
    if (area !== 0) rings.push({ points, area });
  }
  const outers = rings.filter(ring => ring.area > 0).map(ring => ({ ...ring, holes: [] }));
  const holes = rings.filter(ring => ring.area < 0);
  let work = 0;
  for (const hole of holes) {
    let parent;
    for (const outer of outers) {
      validateWorkLimit(work += outer.points.length, "Grid containment work");
      if ((!parent || outer.area < parent.area) && contains(outer.points, hole.points[0])) parent = outer;
    }
    if (!parent) throw new Error("Grid holes require an enclosing outer ring.");
    parent.holes.push(hole);
  }
  const order = (a, b) => comparePoint(a.points[0], b.points[0]) || b.area - a.area;
  const map = points => points.map(point => [point.x, point.y].map((value, axis) => {
    const step = axis === 0 ? grid.dx : grid.dy, coordinate = grid.origin[axis] + value * step;
    if (!Number.isInteger(value) && (coordinate === grid.origin[axis] + Math.floor(value) * step ||
      coordinate === grid.origin[axis] + Math.ceil(value) * step)) {
      throw new RangeError("Grid crossing cannot be represented in the coordinate frame.");
    }
    return coordinate;
  }));
  return outers.sort(order).map(outer => ({ outer: map(outer.points), holes: outer.holes.sort(order).map(hole => map(hole.points)) }));
}
