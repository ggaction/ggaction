import { cloneAndFreeze } from "../../../core/immutable.js";
import { ownRecord } from "../../../core/ownData.js";
import { rejectUnknownProperties } from "../../../core/validation.js";
import { prepareRouteInput, finalizeRouteResult } from "./common.js";
import { resampleRoute } from "./polyline.js";
import { FDEB_EPSILON, forceEdgeMetric, forceCompatibility } from "./compatibility.js";

const STIFFNESS = 0.1, MAX_DISPLACEMENT = 0.1;

export function normalizeForceRouteOptions(input = {}) {
  ownRecord(input, "Force route options");
  rejectUnknownProperties(input, ["compatibilityThreshold", "zeroLength"], "force route options");
  const compatibilityThreshold = input.compatibilityThreshold === undefined ? 0.6 : input.compatibilityThreshold;
  const zeroLength = input.zeroLength === undefined ? "point" : input.zeroLength;
  if (!Number.isFinite(compatibilityThreshold) || compatibilityThreshold < 0 || compatibilityThreshold > 1) throw new RangeError("Force compatibilityThreshold must be between 0 and 1.");
  if (zeroLength !== "point") throw new TypeError("Force zeroLength must be point.");
  return Object.freeze({ compatibilityThreshold, zeroLength });
}

// Trusted solver buffers only. Read every force from the old routes, producing
// fresh points in a separate buffer. No iteration can observe an earlier write.
export function advanceForceRoutes(routes, lengths, neighbors, step) {
  let displacementCaps = 0;
  const next = routes.map((points, edge) => {
    const spring = lengths[edge] <= FDEB_EPSILON ? 0 : STIFFNESS / (lengths[edge] * (points.length - 1));
    return points.map((point, index) => {
      if (index === 0 || index === points.length - 1) return { ...point };
      let fx = spring * (points[index - 1].x + points[index + 1].x - 2 * point.x);
      let fy = spring * (points[index - 1].y + points[index + 1].y - 2 * point.y);
      for (const neighbor of neighbors[edge]) {
        const other = routes[neighbor.edge], q = other[neighbor.reverse ? other.length - 1 - index : index];
        const dx = q.x - point.x, dy = q.y - point.y, distance = Math.hypot(dx, dy);
        if (distance <= FDEB_EPSILON) continue;
        const attraction = neighbor.compatibility / (distance * distance);
        fx += attraction * dx; fy += attraction * dy;
      }
      let dx = step * fx, dy = step * fy;
      const displacement = Math.hypot(dx, dy);
      if (!Number.isFinite(displacement)) throw new RangeError("Force route displacement must be finite.");
      if (displacement > MAX_DISPLACEMENT) {
        const factor = MAX_DISPLACEMENT / displacement;
        dx *= factor; dy *= factor; displacementCaps++;
      }
      return { x: point.x + dx, y: point.y + dy };
    });
  });
  return { routes: next, displacementCaps };
}

export function forceRouteSchedule() {
  const cycles = [];
  let iterations = 60;
  for (let cycle = 0; cycle < 6; cycle++) {
    cycles.push({ cycle, internalSamples: 2 ** cycle, step: 0.1 * 0.5 ** cycle, iterations });
    iterations = Math.max(1, Math.ceil(2 * iterations / 3));
  }
  return cycles;
}

export function bundleForceDirectedRoutes(input, optionsInput = {}, signal) {
  const options = normalizeForceRouteOptions(optionsInput), context = prepareRouteInput(input, signal);
  const metrics = context.edges.map(edge => forceEdgeMetric([edge.source, edge.target]));
  const active = metrics.flatMap((metric, index) => metric.length > FDEB_EPSILON ? [index] : []);
  const candidatePairs = active.length * (active.length - 1) / 2;
  context.budget.pairs(candidatePairs); context.budget.charge(candidatePairs * 16);
  const neighbors = metrics.map(() => []);
  let compatibilityPairs = 0;
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const a = active[i], b = active[j];
    const pair = forceCompatibility(metrics[a], metrics[b], context.model.directed);
    if (pair.compatibility > 0 && pair.compatibility >= options.compatibilityThreshold) {
      const { compatibility, reverse } = pair;
      neighbors[a].push({ edge: b, compatibility, reverse });
      neighbors[b].push({ edge: a, compatibility, reverse });
      compatibilityPairs++;
    }
  }
  const cycles = active.length ? forceRouteSchedule() : [];
  // The exact fixed schedule is known before allocating mutable sample buffers.
  let work = 0;
  for (const cycle of cycles) {
    const points = active.length * (cycle.internalSamples + 2) + (metrics.length - active.length) * 2;
    context.budget.samples(2 * points + metrics.length * 2);
    work += points + cycle.iterations * (metrics.length * 2 + active.length * cycle.internalSamples * 5 + 2 * compatibilityPairs * cycle.internalSamples);
  }
  context.budget.charge(work);
  const lengths = metrics.map(metric => metric.length);
  let routes = context.edges.map(edge => [edge.source, edge.target]), displacementCaps = 0;
  for (const cycle of cycles) {
    context.budget.check();
    routes = routes.map((points, index) => lengths[index] <= FDEB_EPSILON ? points : resampleRoute(points, cycle.internalSamples + 2));
    for (let iteration = 0; iteration < cycle.iterations; iteration++) {
      context.budget.check();
      const next = advanceForceRoutes(routes, lengths, neighbors, cycle.step);
      routes = next.routes; displacementCaps += next.displacementCaps;
    }
  }
  const details = new Map();
  const result = finalizeRouteResult(context, "force-directed@1", context.edges.map((edge, index) => {
    details.set(edge.key, neighbors[index].length);
    return { edgeKey: edge.key, points: routes[index], ...(lengths[index] > FDEB_EPSILON ? {} : { reason: lengths[index] === 0 ? "zero-length" : "below-epsilon" }) };
  }));
  return cloneAndFreeze({ ...result, options,
    routes: result.routes.map(route => ({ ...route, provenance: { ...route.provenance, compatibilityCount: details.get(route.edgeKey) } })),
    diagnostics: { ...result.diagnostics, compatibilityPairs, displacementCaps, totalIterations: cycles.reduce((sum, cycle) => sum + cycle.iterations, 0), schedule: cycles } });
}
