import { cloneAndFreeze } from "../../../core/immutable.js";
import { ownRecord } from "../../../core/ownData.js";
import { rejectUnknownProperties } from "../../../core/validation.js";
import { prepareRouteInput, finalizeRouteResult } from "./common.js";
import { routeLength, validateRoutePoints } from "./polyline.js";
import { shortestRoutePath } from "./shortestPath.js";

export function normalizeEdgePathOptions(input = {}) {
  ownRecord(input, "Edge-path options");
  rejectUnknownProperties(input, ["exponent", "maxStretch", "zeroLength"], "edge-path options");
  const exponent = input.exponent === undefined ? 2 : input.exponent;
  const maxStretch = input.maxStretch === undefined ? 2 : input.maxStretch;
  const zeroLength = input.zeroLength === undefined ? "point" : input.zeroLength;
  if (!Number.isFinite(exponent) || exponent <= 0) throw new RangeError("Edge-path exponent must be positive and finite.");
  if (!Number.isFinite(maxStretch) || maxStretch < 1) throw new RangeError("Edge-path maxStretch must be finite and at least one.");
  if (zeroLength !== "point") throw new TypeError("Edge-path zeroLength must be point.");
  return Object.freeze({ exponent, maxStretch, zeroLength });
}

export function smoothRouteCorners(points, maximumLength, budget, heldSamples = 0) {
  validateRoutePoints(points, budget.limits.maxSamples);
  const originalLength = routeLength(points);
  if (originalLength > maximumLength) throw new RangeError("Edge route exceeds maxStretch before smoothing.");
  const count = 2 + 2 * (points.length - 2);
  budget.samples(heldSamples + points.length + count); budget.charge(count);
  const result = [{ ...points[0] }];
  for (let index = 1; index < points.length - 1; index++) {
    const a = points[index - 1], b = points[index], c = points[index + 1];
    result.push({ x: a.x / 4 + b.x * 0.75, y: a.y / 4 + b.y * 0.75 }, { x: b.x * 0.75 + c.x / 4, y: b.y * 0.75 + c.y / 4 });
  }
  result.push({ ...points.at(-1) });
  const length = routeLength(result);
  return length <= maximumLength ? { points: result, length, smoothing: 0.25 } : { points: points.map(point => ({ ...point })), length: originalLength, smoothing: 0 };
}

export function bundleEdgePathRoutes(input, optionsInput = {}, signal) {
  const options = normalizeEdgePathOptions(optionsInput), context = prepareRouteInput(input, signal), { edges, budget } = context;
  budget.charge(edges.length * (Math.ceil(Math.log2(Math.max(1, edges.length))) + 8));
  const lengths = edges.map(edge => routeLength([edge.source, edge.target])), costs = lengths.map(length => length ** options.exponent);
  if (!costs.every(Number.isFinite)) throw new RangeError("Edge route geometric cost must be finite.");
  const adjacency = new Map(context.nodes.map(node => [node.key, []])), positions = new Map(context.nodes.map(node => [node.key, { x: node.x, y: node.y }]));
  edges.forEach((edge, index) => {
    const original = context.model.edges[edge.index];
    adjacency.get(original.sourceKey).push({ edge: index, target: original.targetKey });
    if (!context.model.directed) adjacency.get(original.targetKey).push({ edge: index, target: original.sourceKey });
  });
  const order = edges.map((_, index) => index).sort((a, b) => costs[b] - costs[a] || a - b);
  const skip = edges.map(() => false), lock = edges.map(() => false), routes = new Array(edges.length), provenance = new Map();
  let heldSamples = edges.length * 2;
  for (const index of order) {
    budget.check(); budget.charge(1);
    const edge = edges[index], original = context.model.edges[edge.index];
    let points = [edge.source, edge.target], controls = points, pathEdges = [index], pathNodes = [original.sourceKey, original.targetKey];
    let reason, pathLength = lengths[index], finalLength = lengths[index], smoothing = 0;
    if (lengths[index] === 0) reason = "zero-length";
    else if (lock[index]) reason = "locked";
    else {
      skip[index] = true;
      const path = shortestRoutePath(adjacency, costs, skip, original.sourceKey, original.targetKey, budget, heldSamples);
      if (path === undefined) { skip[index] = false; reason = "disconnected"; }
      else {
        const candidateLength = path.edges.reduce((sum, edgeIndex) => sum + lengths[edgeIndex], 0);
        const maximumLength = options.maxStretch * lengths[index];
        if (!Number.isFinite(maximumLength)) throw new RangeError("Edge route stretch bound must be finite.");
        if (candidateLength > maximumLength) { skip[index] = false; reason = "stretch"; }
        else {
          budget.samples(heldSamples + path.nodes.length); budget.charge(path.nodes.length);
          controls = path.nodes.map(key => ({ ...positions.get(key) }));
          const smoothed = smoothRouteCorners(controls, maximumLength, budget, heldSamples);
          points = smoothed.points; finalLength = smoothed.length; smoothing = smoothed.smoothing;
          pathLength = candidateLength; pathEdges = path.edges; pathNodes = path.nodes;
          for (const edgeIndex of path.edges) lock[edgeIndex] = true;
        }
      }
    }
    heldSamples += points.length + controls.length; budget.samples(heldSamples);
    const worldPathLength = pathLength * context.frame.scale, worldLength = finalLength * context.frame.scale;
    if (![worldPathLength, worldLength].every(Number.isFinite)) throw new RangeError("Restored edge route length must be finite.");
    routes[index] = { edgeKey: edge.key, points, controlPoints: controls, ...(reason === undefined ? {} : { reason }) };
    provenance.set(edge.key, { pathEdges: pathEdges.map(edgeIndex => edges[edgeIndex].key), pathNodes, originalPathLength: worldPathLength, routeLength: worldLength, normalizedCost: costs[index], smoothing });
  }
  const result = finalizeRouteResult(context, "edge-path@1", routes);
  const states = new Map(edges.map((edge, index) => [edge.key, { locked: lock[index], skipped: skip[index] }]));
  return cloneAndFreeze({ ...result, options,
    routes: result.routes.map(route => ({ ...route, provenance: { ...route.provenance, ...provenance.get(route.edgeKey), ...states.get(route.edgeKey) } })),
    diagnostics: { ...result.diagnostics, processingOrder: order.map(index => edges[index].key), lockedEdges: edges.filter((_, index) => lock[index]).map(edge => edge.key), bundledEdges: edges.filter((_, index) => skip[index]).map(edge => edge.key) } });
}
