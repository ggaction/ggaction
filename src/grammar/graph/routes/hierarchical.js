import { cloneAndFreeze } from "../../../core/immutable.js";
import { ownArray, ownRecord } from "../../../core/ownData.js";
import { rejectUnknownProperties } from "../../../core/validation.js";
import { interpolateNumber } from "../../numeric.js";
import { indexHierarchyModel } from "../../hierarchy/model.js";
import { prepareRouteInput, finalizeRouteResult } from "./common.js";
import { normalizeSplineOptions, sampleClampedSpline } from "./spline.js";

export function normalizeHierarchicalRouteOptions(input = {}) {
  ownRecord(input, "Hierarchical route options");
  rejectUnknownProperties(input, ["strength", "tolerance", "maxSubdivisions", "zeroLength"], "hierarchical route options");
  const strength = input.strength === undefined ? 0.85 : input.strength;
  const zeroLength = input.zeroLength === undefined ? "point" : input.zeroLength;
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) throw new RangeError("Hierarchical route strength must be between 0 and 1.");
  if (zeroLength !== "point") throw new TypeError("Hierarchical zeroLength must be point.");
  return Object.freeze({ strength, zeroLength, ...normalizeSplineOptions({ tolerance: input.tolerance, maxSubdivisions: input.maxSubdivisions }) });
}

export function validateRouteHierarchy(input, context) {
  ownRecord(input, "Route hierarchy input");
  rejectUnknownProperties(input, ["model", "mapping", "positions"], "route hierarchy input");
  if (!["model", "mapping", "positions"].every(key => Object.hasOwn(input, key))) throw new TypeError("Route hierarchy requires own model, mapping and positions.");
  const indexed = indexHierarchyModel(input.model, context.budget.limits.maxNodes);
  context.budget.charge(indexed.work);
  ownArray(input.mapping, "Route hierarchy mapping");
  if (input.mapping.length !== context.model.nodes.length) throw new Error("Hierarchy mapping must cover every graph node exactly once.");
  const graphKeys = new Map(context.positions.map(position => [position.key, position])), mapping = new Map();
  for (const entry of input.mapping) {
    ownRecord(entry, "Route hierarchy mapping entry");
    rejectUnknownProperties(entry, ["nodeKey", "hierarchyKey"], "route hierarchy mapping entry");
    if (!["nodeKey", "hierarchyKey"].every(key => Object.hasOwn(entry, key)) || !graphKeys.has(entry.nodeKey) || !indexed.indexes.has(entry.hierarchyKey) || mapping.has(entry.nodeKey)) throw new Error("Hierarchy mapping requires unique graph keys and existing hierarchy keys.");
    mapping.set(entry.nodeKey, indexed.indexes.get(entry.hierarchyKey));
  }
  ownArray(input.positions, "Route hierarchy positions");
  if (input.positions.length !== indexed.nodes.length) throw new Error("Hierarchy anchors must cover every hierarchy node, including internal nodes.");
  const positions = new Map();
  for (const position of input.positions) {
    ownRecord(position, "Route hierarchy anchor");
    rejectUnknownProperties(position, ["key", "x", "y"], "route hierarchy anchor");
    if (!["key", "x", "y"].every(key => Object.hasOwn(position, key)) || !indexed.indexes.has(position.key) || positions.has(position.key)) throw new Error("Hierarchy anchors require unique existing hierarchy keys.");
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new RangeError("Hierarchy anchor coordinates must be finite.");
    positions.set(position.key, { x: position.x, y: position.y });
  }
  for (const [key, index] of mapping) {
    const graph = graphKeys.get(key), anchor = positions.get(indexed.nodes[index].key);
    if (graph.x !== anchor.x || graph.y !== anchor.y) throw new Error("Mapped hierarchy anchors must match graph node positions.");
  }
  context.budget.charge(indexed.nodes.length * 8 + mapping.size * 4);
  return { ...indexed, mapping, positions };
}

function ancestorPath(source, target, hierarchy, budget) {
  const left = [], right = [];
  let a = source, b = target;
  const parent = index => hierarchy.indexes.get(hierarchy.nodes[index].parentKey);
  while (a !== b) {
    budget.charge(2);
    // The shared hierarchy validator permits one tree, including its explicitly
    // authored synthetic forest root. It rejects disconnected roots beforehand.
    if (hierarchy.nodes[a].depth >= hierarchy.nodes[b].depth) { left.push(a); a = parent(a); }
    else { right.push(b); b = parent(b); }
  }
  return [...left, a, ...right.reverse()];
}

export function bundleHierarchicalRoutes(routeInput, input, optionsInput = {}, signal) {
  const options = normalizeHierarchicalRouteOptions(optionsInput);
  const context = prepareRouteInput(routeInput, signal), hierarchy = validateRouteHierarchy(input, context);
  const routes = [], details = new Map();
  let heldSamples = context.edges.length * 2;
  for (const edge of context.edges) {
    const original = context.model.edges[edge.index];
    const path = ancestorPath(hierarchy.mapping.get(original.sourceKey), hierarchy.mapping.get(original.targetKey), hierarchy, context.budget);
    const hierarchyKeys = path.map(index => hierarchy.nodes[index].key);
    context.budget.samples(heldSamples + Math.max(2, path.length));
    context.budget.charge(path.length * 8);
    const zero = edge.source.x === edge.target.x && edge.source.y === edge.target.y;
    let controls, points, degree = 1;
    if (zero) controls = points = [edge.source, edge.target];
    else {
      const last = path.length - 1;
      controls = path.map((nodeIndex, index) => {
        const anchor = hierarchy.positions.get(hierarchy.nodes[nodeIndex].key), t = index / last;
        const chordX = interpolateNumber(edge.source.x, edge.target.x, t), chordY = interpolateNumber(edge.source.y, edge.target.y, t);
        return { x: interpolateNumber(chordX, (anchor.x - context.frame.x) / context.frame.scale, options.strength), y: interpolateNumber(chordY, (anchor.y - context.frame.y) / context.frame.scale, options.strength) };
      });
      // Avoid round-off from re-normalizing the shared exact endpoint anchors.
      controls[0] = edge.source; controls[controls.length - 1] = edge.target;
      if (options.strength === 0) points = [edge.source, edge.target];
      else {
        const sampled = sampleClampedSpline(controls, { tolerance: options.tolerance, maxSubdivisions: options.maxSubdivisions }, context.budget, heldSamples);
        points = sampled.points; degree = sampled.degree;
      }
    }
    heldSamples += controls.length + points.length;
    context.budget.samples(heldSamples);
    routes.push({ edgeKey: edge.key, points, controlPoints: controls, ...(zero ? { reason: "zero-length" } : {}) });
    details.set(edge.key, { hierarchyKeys, strength: options.strength, splineVersion: "clamped-uniform@1", degree });
  }
  const result = finalizeRouteResult(context, "hierarchical@1", routes);
  return cloneAndFreeze({ ...result, options, routes: result.routes.map(route => ({ ...route, provenance: { ...route.provenance, ...details.get(route.edgeKey) } })) });
}
