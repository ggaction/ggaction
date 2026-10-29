import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { segmentDistance, pathFillContains } from "../pathGeometry.js";
import { stableFiniteSum } from "../numeric.js";
import { createGeometryBudget, snapshotGeometryJSON } from "./input.js";
import { expandDecodedTopology } from "./topology.js";
import { normalizeGeometry } from "./geometry.js";

const same = (a, b) => a.x === b.x && a.y === b.y;
const orient = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const ringCommands = ring => ring.map((point, i) => ({ op: i ? "L" : "M", ...point }));

function simplifyArc(points, tolerance, budget) {
  const retained = new Set([0, points.length - 1]), pending = [[0, points.length - 1]];
  let error = 0;
  while (pending.length) {
    const [from, to] = pending.pop(); let maximum = 0, split;
    for (let index = from + 1; index < to; index++) {
      budget.charge(); const distance = segmentDistance(points[index], points[from], points[to]);
      if (distance > maximum) { maximum = distance; split = index; }
    }
    if (maximum > tolerance) {
      retained.add(split); pending.push([split, to], [from, split]);
    } else error = Math.max(error, maximum);
  }
  return { indices: [...retained].sort((a, b) => a - b), error };
}

function polygonRings(geometries, normalized) {
  const rings = [], pending = [...geometries].reverse();
  while (pending.length) {
    const geometry = pending.pop(); if (geometry === null) continue;
    if (geometry.type === "GeometryCollection") {
      for (let i = geometry.geometries.length - 1; i >= 0; i--) pending.push(geometry.geometries[i]);
    } else if (geometry.type === "Polygon") rings.push(...geometry.coordinates.map(ring => ring.map(normalized)));
    else if (geometry.type === "MultiPolygon") for (const polygon of geometry.coordinates) rings.push(...polygon.map(ring => ring.map(normalized)));
  }
  return rings;
}
function winding(ring) {
  return Math.sign(stableFiniteSum(ring.slice(1, -1).map((point, i) => orient(ring[0], point, ring[i + 2])), "Geographic ring area", { compensated: true }));
}
function intersects(a, b) {
  if (a.maxY < b.minY || b.maxY < a.minY) return false;
  const o1 = orient(a.from, a.to, b.from), o2 = orient(a.from, a.to, b.to);
  const o3 = orient(b.from, b.to, a.from), o4 = orient(b.from, b.to, a.to);
  if (o1 === 0 && o2 === 0) {
    const axis = a.from.x !== a.to.x ? "x" : "y";
    const overlap = Math.min(Math.max(a.from[axis], a.to[axis]), Math.max(b.from[axis], b.to[axis])) -
      Math.max(Math.min(a.from[axis], a.to[axis]), Math.min(b.from[axis], b.to[axis]));
    if (overlap > 0) return true;
  }
  if (same(a.from, b.from) || same(a.from, b.to) || same(a.to, b.from) || same(a.to, b.to)) return false;
  return Math.sign(o1) * Math.sign(o2) <= 0 && Math.sign(o3) * Math.sign(o4) <= 0;
}
function hasCrossing(arcs, budget) {
  const segments = arcs.flatMap(points => points.slice(1).flatMap((to, index) => {
    const from = points[index]; if (same(from, to)) return [];
    return [{ from, to, minX: Math.min(from.x, to.x), maxX: Math.max(from.x, to.x),
      minY: Math.min(from.y, to.y), maxY: Math.max(from.y, to.y) }];
  }));
  budget.charge(segments.length * Math.ceil(Math.log2(Math.max(2, segments.length))));
  segments.sort((a, b) => a.minX - b.minX || a.maxX - b.maxX);
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length && segments[j].minX <= segments[i].maxX; j++) {
    budget.charge(); if (intersects(segments[i], segments[j])) return true;
  }
  return false;
}
function topologyFailure(before, after, arcs, normalized, budget) {
  const oldRings = polygonRings(before, normalized), nextRings = polygonRings(after, normalized);
  for (let i = 0; i < nextRings.length; i++) {
    budget.charge(oldRings[i].length + nextRings[i].length);
    if (nextRings[i].length < 4) return "ring-collapse";
    if (winding(nextRings[i]) !== winding(oldRings[i])) return "ring-winding";
  }
  if (hasCrossing(arcs, budget)) return "crossing";
  for (let i = 0; i < oldRings.length; i++) for (let j = 0; j < oldRings.length; j++) {
    if (i === j) continue;
    budget.charge(oldRings[i].length + nextRings[i].length);
    const query = oldRings[j][0];
    if (pathFillContains(ringCommands(oldRings[i]), query, { fillRule: "evenodd" }) !==
        pathFillContains(ringCommands(nextRings[i]), query, { fillRule: "evenodd" })) return "ring-containment";
  }
  return null;
}

export function simplifySharedTopology(input, options) {
  ownRecord(options, "Shared topology simplification");
  rejectUnknownProperties(options, ["coordinateKind", "tolerance", "limits"], "shared topology simplification");
  if (!["planar", "geographic"].includes(options.coordinateKind)) throw new TypeError("Shared topology requires an explicit coordinateKind.");
  if (!Number.isFinite(options.tolerance) || options.tolerance < 0) throw new RangeError("Shared topology tolerance must be finite and nonnegative.");
  const budget = createGeometryBudget(options.limits), topology = snapshotGeometryJSON(input, budget);
  const original = expandDecodedTopology(topology, options.coordinateKind, budget)
    .map(entry => normalizeGeometry(entry.geometry, options.coordinateKind, budget));
  const allIndices = topology.arcs.map(arc => arc.map((_, index) => index));
  let keptIndices = allIndices, geometries = original, arcs = topology.arcs, reason = null, maxDeviation = 0, seamArcCount = 0;
  const inputPoints = arcs.reduce((sum, arc) => sum + arc.length, 0);
  if (options.tolerance > 0 && inputPoints > 0) {
    let scale = 1;
    for (const arc of arcs) for (const point of arc) scale = Math.max(scale, Math.abs(point[0]), Math.abs(point[1]));
    const coordinates = new Map();
    const normalized = point => {
      budget.charge();
      const result = { x: point[0] / scale, y: point[1] / scale }, key = JSON.stringify([result.x, result.y]);
      const previous = coordinates.get(key);
      if (previous && (previous[0] !== point[0] || previous[1] !== point[1])) throw new RangeError("Shared topology coordinate precision cannot preserve distinct vertices.");
      coordinates.set(key, point); return result;
    };
    const points = arcs.map(arc => arc.map(normalized));
    keptIndices = arcs.map((arc, i) => {
      const seam = options.coordinateKind === "geographic" && arc.some((point, j) => j && Math.abs(point[0] - arc[j - 1][0]) > 180);
      if (seam) { seamArcCount++; return allIndices[i]; }
      const simplified = simplifyArc(points[i], options.tolerance / scale, budget);
      maxDeviation = Math.max(maxDeviation, simplified.error * scale); return simplified.indices;
    });
    arcs = arcs.map((arc, i) => keptIndices[i].map(index => arc[index]));
    if (arcs.some((arc, i) => arc.length !== topology.arcs[i].length)) {
      const expanded = expandDecodedTopology({ ...topology, arcs }, options.coordinateKind, budget).map(entry => entry.geometry);
      reason = topologyFailure(original.map(entry => entry.geometry), expanded, arcs.map(arc => arc.map(normalized)), normalized, budget);
      if (reason) { arcs = topology.arcs; keptIndices = allIndices; maxDeviation = 0; }
      else geometries = expanded.map(geometry => normalizeGeometry(geometry, options.coordinateKind, budget));
    }
  }
  return cloneAndFreeze({ topology: { ...topology, arcs }, geometries, keptIndices,
    diagnostics: { inputPoints, outputPoints: arcs.reduce((sum, arc) => sum + arc.length, 0), maxDeviation,
      seamArcCount, retainedForTopology: reason, work: budget.diagnostics().work } });
}
