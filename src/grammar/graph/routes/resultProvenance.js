import { ownArray, ownRecord } from "../../../core/ownData.js";
import { routeLength } from "./polyline.js";
import { FDEB_EPSILON } from "./compatibility.js";
import { forceRouteSchedule } from "./forceDirected.js";
import { densityRouteBandwidth, DENSITY_ROUTE_POLICY } from "./density.js";

function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires its exact stored fields.`);
}
function integer(value, maximum, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) throw new RangeError(`${label} is outside its work bound.`);
}
function keys(values, allowed, label, complete = false) {
  ownArray(values, label);
  if (new Set(values).size !== values.length || values.some(value => !allowed.has(value)) || (complete && values.length !== allowed.size)) throw new TypeError(`${label} has stale membership.`);
}
function close(a, b) { return Number.isFinite(a) && Math.abs(a - b) <= Number.EPSILON * 64 * Math.max(1, Math.abs(a), Math.abs(b)); }

export function validateRouteProvenance(job, result, context) {
  const method = job.intent.method, options = job.intent.options;
  const positions = new Map(context.positions.map(node => [node.key, node]));
  const edges = new Map(context.model.edges.map(edge => [edge.key, edge]));
  const hierarchyInput = Object.hasOwn(job, "hierarchy") ? job.hierarchy : undefined;
  const hierarchy = hierarchyInput && new Map(hierarchyInput.model.nodes.map(node => [node.key, node]));
  const mapping = hierarchyInput && new Map(hierarchyInput.mapping.map(item => [item.nodeKey, item.hierarchyKey]));
  for (const route of result.routes) {
    const p = route.provenance, a = positions.get(route.sourceKey), b = positions.get(route.targetKey);
    ownRecord(p, "Route provenance");
    const extra = method === "hierarchical" ? ["hierarchyKeys", "strength", "splineVersion", "degree"]
      : method === "force-directed" ? ["compatibilityCount"] : method === "edge-path"
        ? ["pathEdges", "pathNodes", "originalPathLength", "routeLength", "normalizedCost", "smoothing", "locked", "skipped"] : [];
    exact(p, ["algorithmVersion", ...extra, ...(Object.hasOwn(p, "reason") ? ["reason"] : [])], "Route provenance");
    const length = Math.hypot((b.x - context.frame.x) / context.frame.scale - (a.x - context.frame.x) / context.frame.scale,
      (b.y - context.frame.y) / context.frame.scale - (a.y - context.frame.y) / context.frame.scale);
    const zero = a.x === b.x && a.y === b.y;
    if (p.algorithmVersion !== job.algorithmVersion || (p.reason !== undefined && !["zero-length", "below-epsilon", "locked", "disconnected", "stretch"].includes(p.reason))) throw new TypeError("Route provenance algorithm or reason is invalid.");
    if ((zero && p.reason !== "zero-length") || (!zero && p.reason === "zero-length")) throw new TypeError("Route zero-length provenance is stale.");
    if (zero && [...route.commands, ...route.controlPoints].some(point => point.x !== a.x || point.y !== a.y)) throw new TypeError("Zero-length route fallback must remain a point.");
    if (method !== "edge-path" && p.reason !== (zero ? "zero-length" : method === "force-directed" && length <= FDEB_EPSILON ? "below-epsilon" : undefined)) throw new TypeError("Route fallback reason is incompatible with its method.");
    if (method === "hierarchical") {
      keys(p.hierarchyKeys, hierarchy, "Route hierarchy path");
      if (p.hierarchyKeys[0] !== mapping.get(route.sourceKey) || p.hierarchyKeys.at(-1) !== mapping.get(route.targetKey) ||
          p.strength !== options.strength || p.splineVersion !== "clamped-uniform@1" || p.degree !== (zero || options.strength === 0 ? 1 : Math.min(3, p.hierarchyKeys.length - 1))) throw new TypeError("Route hierarchy provenance is stale.");
      for (let i = 1; i < p.hierarchyKeys.length; i++) {
        const left = hierarchy.get(p.hierarchyKeys[i - 1]), right = hierarchy.get(p.hierarchyKeys[i]);
        if (left.parentKey !== right.key && right.parentKey !== left.key) throw new TypeError("Route hierarchy path must follow actual parent links.");
      }
    } else if (method === "force-directed") {
      integer(p.compatibilityCount, Math.max(0, result.routes.length - 1), "Route compatibility count");
    } else if (method === "edge-path") {
      keys(p.pathEdges, edges, "Route path edges");
      ownArray(p.pathNodes, "Route path nodes");
      if (p.pathNodes.length !== p.pathEdges.length + 1 || p.pathNodes[0] !== route.sourceKey || p.pathNodes.at(-1) !== route.targetKey ||
          p.pathNodes.some(key => !positions.has(key)) || typeof p.locked !== "boolean" || typeof p.skipped !== "boolean" ||
          ![0, .25].includes(p.smoothing) || !close(p.normalizedCost, Math.pow(length, options.exponent))) throw new TypeError("Route edge-path provenance is stale.");
      let total = 0;
      p.pathEdges.forEach((key, index) => {
        const edge = edges.get(key), source = p.pathNodes[index], target = p.pathNodes[index + 1];
        if (!(edge.sourceKey === source && edge.targetKey === target) && (edge.directed || edge.sourceKey !== target || edge.targetKey !== source)) throw new TypeError("Route path must follow actual directed edges.");
        const from = positions.get(source), to = positions.get(target);
        total += Math.hypot((to.x - context.frame.x) / context.frame.scale - (from.x - context.frame.x) / context.frame.scale,
          (to.y - context.frame.y) / context.frame.scale - (from.y - context.frame.y) / context.frame.scale);
      });
      if (route.controlPoints.length !== p.pathNodes.length || route.controlPoints.some((point, index) => {
        const expected = positions.get(p.pathNodes[index]);
        return !close(point.x, expected.x) || !close(point.y, expected.y);
      })) throw new TypeError("Route control polygon must follow actual node anchors.");
      const sampledLength = routeLength(route.commands.map(({ x, y }) => ({ x, y })));
      if (!close(p.originalPathLength, total * context.frame.scale) || !close(p.routeLength, sampledLength)) throw new TypeError("Route path lengths are stale.");
      if (p.skipped !== (p.reason === undefined) || (p.reason === "locked" && !p.locked) || p.reason === "below-epsilon") throw new TypeError("Route skip/lock provenance is inconsistent.");
    }
  }
}

export function validateRouteDiagnostics(job, result, context) {
  const d = result.diagnostics, method = job.intent.method;
  const extra = method === "force-directed" ? ["compatibilityPairs", "displacementCaps", "totalIterations", "schedule"]
    : method === "density" ? ["gridSize", "step", "iterations", "schedule"]
      : method === "edge-path" ? ["processingOrder", "lockedEdges", "bundledEdges"] : [];
  exact(d, ["work", "candidatePairs", "peakSamples", ...extra], "Route diagnostics");
  integer(d.work, 10_000_000, "Route work");
  integer(d.candidatePairs, context.budget.limits.maxCandidatePairs, "Route candidate pairs");
  integer(d.peakSamples, context.budget.limits.maxSamples, "Route peak samples");
  const active = context.edges.some(edge => Math.hypot(edge.target.x - edge.source.x, edge.target.y - edge.source.y) > (method === "force-directed" ? FDEB_EPSILON : 0));
  if (method === "force-directed") {
    integer(d.compatibilityPairs, d.candidatePairs, "Route compatible pairs");
    integer(d.displacementCaps, 10_000_000, "Route displacement caps");
    ownArray(d.schedule, "Route force schedule");
    const expected = active ? forceRouteSchedule() : [];
    if (d.schedule.length !== expected.length || d.totalIterations !== expected.reduce((sum, cycle) => sum + cycle.iterations, 0)) throw new TypeError("Route force schedule is stale.");
    d.schedule.forEach((cycle, i) => {
      exact(cycle, ["cycle", "internalSamples", "step", "iterations"], "Route force cycle");
      if (Object.keys(expected[i]).some(key => cycle[key] !== expected[i][key])) throw new TypeError("Route force cycle is stale.");
    });
  } else if (method === "density") {
    ownArray(d.schedule, "Route density schedule");
    if (d.gridSize !== DENSITY_ROUTE_POLICY.gridSize || d.step !== DENSITY_ROUTE_POLICY.step || d.iterations !== (active ? DENSITY_ROUTE_POLICY.iterations : 0) || d.schedule.length !== d.iterations) throw new TypeError("Route density schedule is stale.");
    d.schedule.forEach((iteration, index) => {
      exact(iteration, ["iteration", "bandwidth", "fieldCells", "samples"], "Route density iteration");
      if (iteration.iteration !== index || iteration.bandwidth !== densityRouteBandwidth(index)) throw new TypeError("Route density bandwidth is stale.");
      integer(iteration.fieldCells, 8 * d.gridSize * d.gridSize, "Route density cells");
      integer(iteration.samples, context.budget.limits.maxSamples, "Route density samples");
    });
  } else if (method === "edge-path") {
    const edges = new Set(context.model.edges.map(edge => edge.key));
    keys(d.processingOrder, edges, "Route processing order", true);
    for (const [field, flag] of [["lockedEdges", "locked"], ["bundledEdges", "skipped"]]) {
      keys(d[field], edges, `Route ${field}`);
      const expected = new Set(result.routes.filter(route => route.provenance[flag]).map(route => route.edgeKey));
      if (d[field].length !== expected.size || d[field].some(key => !expected.has(key))) throw new TypeError("Route lock/skip diagnostics are stale.");
    }
  }
}
