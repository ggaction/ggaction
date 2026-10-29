import { cloneAndFreeze } from "../../../core/immutable.js";
import { ownArray, ownRecord } from "../../../core/ownData.js";
import { compareRowKeys, encodeRowKey } from "../../../core/itemIdentity.js";
import { rejectUnknownProperties } from "../../../core/validation.js";
import { buildLinearPathCommands } from "../../pathCommands.js";
import { resolvePathCommandBounds } from "../../pathGeometry.js";
import { indexGraphModel } from "../model.js";
import { createRouteBudget } from "./budget.js";
import { validateRoutePoints } from "./polyline.js";

function orderedIndexes(keys, size, budget) {
  if (Array.isArray(keys) && keys.length !== size) throw new Error("Route typed order keys must match graph records.");
  ownArray(keys, "Route typed order keys");
  const seen = new Set();
  keys.forEach(key => {
    const token = encodeRowKey(key);
    budget.charge(token.length);
    if (seen.has(token)) throw new Error("Route typed order keys must be unique.");
    seen.add(token);
  });
  budget.charge(size * Math.ceil(Math.log2(Math.max(2, size))));
  return keys.map((_, index) => index).sort((a, b) => compareRowKeys(keys[a], keys[b]));
}

function coordinateFrame(positions) {
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const { x, y } of positions) {
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (positions.length === 0) return Object.freeze({ x: 0, y: 0, scale: 1 });
  const scale = Math.max(right - left, bottom - top);
  if (!Number.isFinite(scale)) throw new RangeError("Route coordinate extent must be finite.");
  return Object.freeze({ x: left, y: top, scale: scale === 0 ? 1 : scale });
}

// Raw typed order keys are supplied by the source adapter. Normalized graph keys
// remain opaque; route code never decodes another owner's identity token.
export function prepareRouteInput(input, signal) {
  ownRecord(input, "Route input");
  rejectUnknownProperties(input, ["model", "positions", "order", "limits"], "route input");
  if (!["model", "positions", "order"].every(key => Object.hasOwn(input, key))) throw new TypeError("Route input requires own model, positions and order.");
  const budget = createRouteBudget(input.limits, signal);
  const indexed = indexGraphModel(input.model, { maxNodes: budget.limits.maxNodes, maxEdges: budget.limits.maxEdges });
  budget.charge(indexed.work);
  budget.samples(indexed.edges.length * 2);
  budget.charge(indexed.nodes.length * 8 + indexed.edges.length * 2);
  ownRecord(input.order, "Route typed order");
  rejectUnknownProperties(input.order, ["nodes", "edges"], "route typed order");
  if (!["nodes", "edges"].every(key => Object.hasOwn(input.order, key))) throw new TypeError("Route typed order requires own node and edge keys.");
  const nodeOrder = orderedIndexes(input.order.nodes, indexed.nodes.length, budget);
  const edgeOrder = orderedIndexes(input.order.edges, indexed.edges.length, budget);
  if (Array.isArray(input.positions) && input.positions.length !== indexed.nodes.length) throw new Error("Route positions must cover every graph node exactly once.");
  ownArray(input.positions, "Route positions");
  const byKey = new Map();
  for (const position of input.positions) {
    ownRecord(position, "Route position");
    rejectUnknownProperties(position, ["key", "x", "y"], "route position");
    if (!["key", "x", "y"].every(key => Object.hasOwn(position, key))) throw new TypeError("Route position requires own key, x and y.");
    if (!indexed.nodeIndexes.has(position.key) || byKey.has(position.key)) throw new Error("Route positions require unique existing node keys.");
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new RangeError("Route positions require finite x and y.");
    byKey.set(position.key, { key: position.key, x: position.x, y: position.y });
  }
  const positions = cloneAndFreeze(indexed.nodes.map(node => byKey.get(node.key)));
  const frame = coordinateFrame(positions), model = cloneAndFreeze(input.model);
  const normalized = positions.map(({ key, x, y }) => ({ key, x: (x - frame.x) / frame.scale, y: (y - frame.y) / frame.scale }));
  const edges = edgeOrder.map(index => {
    const edge = model.edges[index];
    const { x: sx, y: sy } = normalized[indexed.nodeIndexes.get(edge.sourceKey)];
    const { x: tx, y: ty } = normalized[indexed.nodeIndexes.get(edge.targetKey)];
    return { index, key: edge.key, source: { x: sx, y: sy }, target: { x: tx, y: ty } };
  });
  return Object.freeze({ model, positions, frame, budget, nodes: cloneAndFreeze(nodeOrder.map(index => normalized[index])), edges: cloneAndFreeze(edges) });
}

function samePoint(a, b) { return a.x === b.x && a.y === b.y; }

function restorePoints(points, context, edge, maximum) {
  validateRoutePoints(points, maximum);
  if (!samePoint(points[0], edge.source) || !samePoint(points.at(-1), edge.target)) throw new Error("Route endpoints must match their original anchors.");
  const { frame } = context;
  return points.map(point => {
    const restored = { x: frame.x + point.x * frame.scale, y: frame.y + point.y * frame.scale };
    if (!Number.isFinite(restored.x) || !Number.isFinite(restored.y)) throw new RangeError("Restored route coordinates must be finite.");
    return restored;
  });
}

// Only complete solver outputs cross this boundary. Methods may add their own
// validated provenance after the common geometry has been finalized.
export function finalizeRouteResult(context, algorithmVersion, routes) {
  if (typeof algorithmVersion !== "string" || !algorithmVersion) throw new TypeError("Route algorithmVersion must be explicit.");
  ownArray(routes, "Route results");
  if (routes.length !== context.edges.length) throw new Error("Route results must cover every original edge.");
  const edges = new Map(context.edges.map(edge => [edge.key, edge]));
  const anchors = new Map(context.positions.map(position => [position.key, position]));
  const result = new Array(routes.length);
  let samples = 0;
  for (const route of routes) {
    ownRecord(route, "Route result");
    rejectUnknownProperties(route, ["edgeKey", "points", "controlPoints", "reason"], "route result");
    if (!["edgeKey", "points"].every(key => Object.hasOwn(route, key))) throw new TypeError("Route result requires own edge key and points.");
    const edge = edges.get(route.edgeKey);
    if (edge === undefined || result[edge.index] !== undefined) throw new Error("Route results require unique original edge keys.");
    if (route.reason !== undefined && (typeof route.reason !== "string" || !route.reason)) throw new TypeError("Route fallback reason must be a non-empty string.");
    validateRoutePoints(route.points);
    validateRoutePoints(route.controlPoints ?? route.points, context.budget.limits.maxSamples);
    const count = route.points.length + (route.controlPoints ?? route.points).length;
    samples += count; context.budget.samples(samples); context.budget.charge(count * 4);
    const points = restorePoints(route.points, context, edge);
    const controls = restorePoints(route.controlPoints ?? route.points, context, edge, context.budget.limits.maxSamples);
    const original = context.model.edges[edge.index];
    const source = anchors.get(original.sourceKey), target = anchors.get(original.targetKey);
    for (const values of [points, controls]) {
      values[0] = { x: source.x, y: source.y };
      values[values.length - 1] = { x: target.x, y: target.y };
    }
    const commands = buildLinearPathCommands(points);
    result[edge.index] = {
      edgeKey: original.key, sourceKey: original.sourceKey, targetKey: original.targetKey,
      controlPoints: controls, commands, bounds: resolvePathCommandBounds(commands),
      provenance: { algorithmVersion, ...(route.reason === undefined ? {} : { reason: route.reason }) }
    };
  }
  context.budget.check();
  return cloneAndFreeze({ complete: true, routes: result, diagnostics: context.budget.diagnostics() });
}
