import { cloneAndFreeze } from "../../../core/immutable.js";
import { ownRecord } from "../../../core/ownData.js";
import { rejectUnknownProperties } from "../../../core/validation.js";
import { prepareRouteInput, finalizeRouteResult } from "./common.js";
import { resampleRoute } from "./polyline.js";
import { FDEB_EPSILON, forceEdgeMetric } from "./compatibility.js";
import { buildForceNeighbors, forEachForceNeighbor, disposeForceNeighbors } from "./forceNeighbors.js";

const STIFFNESS = 0.1, MAX_DISPLACEMENT = 0.1;

export function normalizeForceRouteOptions(input = {}) {
  input = Object.assign(Object.create(null), ownRecord(input, "Force route options"));
  rejectUnknownProperties(input, ["compatibilityThreshold", "zeroLength"], "force route options");
  const compatibilityThreshold = input.compatibilityThreshold === undefined ? 0.6 : input.compatibilityThreshold;
  const zeroLength = input.zeroLength === undefined ? "point" : input.zeroLength;
  if (!Number.isFinite(compatibilityThreshold) || compatibilityThreshold < 0 || compatibilityThreshold > 1) throw new RangeError("Force compatibilityThreshold must be between 0 and 1.");
  if (zeroLength !== "point") throw new TypeError("Force zeroLength must be point.");
  return Object.freeze({ compatibilityThreshold, zeroLength });
}

// Trusted solver buffers only: the solver builds symmetric neighbors in ascending
// edge order. One pair contributes to both fresh force buffers. Iterating lower
// edges first retains each edge's original neighbor addition order exactly.
export function advanceForceRoutes(routes, lengths, neighbors, step, symmetric = false) {
  const next = routes.map((points, edge) => {
    const spring = lengths[edge] <= FDEB_EPSILON ? 0 : STIFFNESS / (lengths[edge] * (points.length - 1));
    return points.map((point, index) => index === 0 || index === points.length - 1 ? { ...point } : {
      x: spring * (points[index - 1].x + points[index + 1].x - 2 * point.x),
      y: spring * (points[index - 1].y + points[index + 1].y - 2 * point.y)
    });
  });
  // Direct private-helper callers retain the ordered scalar path. Only this
  // solver's locally constructed symmetric neighbor table enables pair reuse.
  if (!symmetric) for (let edge = 0; edge < routes.length; edge++) {
    const points = routes[edge];
    for (let index = 1; index < points.length - 1; index++) for (const neighbor of neighbors[edge]) {
      const other = routes[neighbor.edge], point = points[index];
      const q = other[neighbor.reverse ? other.length - 1 - index : index];
      const dx = q.x - point.x, dy = q.y - point.y, distance = Math.hypot(dx, dy);
      if (distance <= FDEB_EPSILON) continue;
      const attraction = neighbor.compatibility / (distance * distance);
      next[edge][index].x += attraction * dx; next[edge][index].y += attraction * dy;
    }
  }
  else {
    const pair = (edge, otherEdge, compatibility, reverse) => {
      const points = routes[edge], other = routes[otherEdge];
      for (let index = 1; index < points.length - 1; index++) {
        const pairedIndex = reverse ? other.length - 1 - index : index;
        const point = points[index], q = other[pairedIndex];
        const dx = q.x - point.x, dy = q.y - point.y, distance = Math.hypot(dx, dy);
        if (distance <= FDEB_EPSILON) continue;
        const attraction = compatibility / (distance * distance);
        next[edge][index].x += attraction * dx; next[edge][index].y += attraction * dy;
        // Keep the original subtractions, including signed zero, on the reverse side.
        next[otherEdge][pairedIndex].x += attraction * (point.x - q.x);
        next[otherEdge][pairedIndex].y += attraction * (point.y - q.y);
      }
    };
    if (Array.isArray(neighbors)) {
      for (let edge = 0; edge < routes.length; edge++) for (const neighbor of neighbors[edge]) {
        if (neighbor.edge > edge) pair(edge, neighbor.edge, neighbor.compatibility, neighbor.reverse);
      }
    } else forEachForceNeighbor(neighbors, pair);
  }
  let displacementCaps = 0;
  for (let edge = 0; edge < routes.length; edge++) {
    const points = routes[edge];
    for (let index = 1; index < points.length - 1; index++) {
      const force = next[edge][index], point = points[index];
      let dx = step * force.x, dy = step * force.y;
      const displacement = Math.hypot(dx, dy);
      if (!Number.isFinite(displacement)) throw new RangeError("Force route displacement must be finite.");
      if (displacement > MAX_DISPLACEMENT) {
        const factor = MAX_DISPLACEMENT / displacement;
        dx *= factor; dy *= factor; displacementCaps++;
      }
      force.x = point.x + dx; force.y = point.y + dy;
    }
  }
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

export function bundleForceDirectedRoutes(input, optionsInput = {}, signal, scope) {
  const options = normalizeForceRouteOptions(optionsInput), context = prepareRouteInput(input, signal, scope);
  const metrics = context.edges.map(edge => forceEdgeMetric([edge.source, edge.target]));
  const active = metrics.flatMap((metric, index) => metric.length > FDEB_EPSILON ? [index] : []);
  const candidatePairs = active.length * (active.length - 1) / 2;
  context.budget.pairs(candidatePairs); context.budget.charge(candidatePairs * 16);
  const neighbors = buildForceNeighbors(metrics, active, context.model.directed, options.compatibilityThreshold, context.budget.check, undefined, context.budget);
  try {
    const compatibilityPairs = neighbors.pairs;
    const cycles = active.length ? forceRouteSchedule() : [];
    // The exact fixed schedule is known before allocating mutable sample buffers.
    // Each symmetric pair now evaluates its distance and attraction once per sample.
    let work = 0;
    for (const cycle of cycles) {
      const points = active.length * (cycle.internalSamples + 2) + (metrics.length - active.length) * 2;
      context.budget.samples(2 * points + metrics.length * 2);
      work += points + cycle.iterations * (metrics.length * 2 + active.length * cycle.internalSamples * 5 + compatibilityPairs * cycle.internalSamples);
    }
    context.budget.charge(work);
    const lengths = metrics.map(metric => metric.length);
    let routes = context.edges.map(edge => [edge.source, edge.target]), displacementCaps = 0;
    for (const cycle of cycles) {
      context.budget.check();
      routes = routes.map((points, index) => lengths[index] <= FDEB_EPSILON ? points : resampleRoute(points, cycle.internalSamples + 2));
      for (let iteration = 0; iteration < cycle.iterations; iteration++) {
        context.budget.check();
        const next = advanceForceRoutes(routes, lengths, neighbors, cycle.step, true);
        routes = next.routes; displacementCaps += next.displacementCaps;
      }
    }
    const details = new Map();
    const result = finalizeRouteResult(context, "force-directed@1", context.edges.map((edge, index) => {
      details.set(edge.key, neighbors.degrees[index]);
      return { edgeKey: edge.key, points: routes[index], ...(lengths[index] > FDEB_EPSILON ? {} : { reason: lengths[index] === 0 ? "zero-length" : "below-epsilon" }) };
    }));
    return cloneAndFreeze({ ...result, options,
      routes: result.routes.map(route => ({ ...route, provenance: { ...route.provenance, compatibilityCount: details.get(route.edgeKey) } })),
      diagnostics: { ...result.diagnostics, compatibilityPairs, displacementCaps, totalIterations: cycles.reduce((sum, cycle) => sum + cycle.iterations, 0), schedule: cycles } });
  } finally { disposeForceNeighbors(neighbors); }
}
