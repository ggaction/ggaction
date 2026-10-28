import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { requireFiniteResult } from "../numeric.js";
import { polarToCartesian } from "../polar.js";
import { graphLimits, indexGraphModel } from "./model.js";

// Coordinates bind opaque model keys; topology and identity validation stay in
// the graph model owner. No dataset fields or resource revisions are inferred.
export function layoutGraphFixed(model, positions, limits = {}) {
  const resolved = graphLimits(limits), indexed = indexGraphModel(model, resolved);
  let work = indexed.work;
  const charge = amount => validateWorkLimit(work += amount, "Fixed graph layout work");
  if (Array.isArray(positions) && positions.length !== indexed.nodes.length) throw new Error("Fixed graph positions must cover every node exactly once.");
  charge(indexed.nodes.length * 32);
  ownArray(positions, "Fixed graph positions");
  const byKey = new Map();
  for (const position of positions) {
    ownRecord(position, "Fixed graph position");
    rejectUnknownProperties(position, ["key", "x", "y"], "fixed graph position");
    if (["key", "x", "y"].some(field => !Object.hasOwn(position, field))) throw new TypeError("Fixed graph positions require own key, x and y fields.");
    if (typeof position.key !== "string" || position.key.length === 0) throw new TypeError("Fixed graph position keys must be non-empty opaque strings.");
    charge(position.key.length * 4);
    if (!indexed.nodeIndexes.has(position.key) || byKey.has(position.key)) throw new Error("Fixed graph positions require unique existing node keys.");
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new TypeError("Fixed graph coordinates must be finite numbers.");
    byKey.set(position.key, position);
  }
  const nodes = indexed.nodes.map(({ key }) => ({ key, x: byKey.get(key).x, y: byKey.get(key).y }));
  return cloneAndFreeze({ method: "fixed", nodes, options: resolved });
}

export function layoutGraphCircular(model, options) {
  ownRecord(options, "Circular graph options");
  rejectUnknownProperties(options, ["center", "radius", "startAngle", "maxNodes", "maxEdges"], "circular graph");
  if (["center", "radius", "startAngle"].some(field => !Object.hasOwn(options, field))) throw new TypeError("Circular graph layout requires own center, radius and startAngle options.");
  if (!Array.isArray(options.center) || options.center.length !== 2) throw new TypeError("Circular graph center requires two finite coordinates.");
  ownArray(options.center, "Circular graph center");
  if (!options.center.every(Number.isFinite) || !Number.isFinite(options.startAngle) ||
      !Number.isFinite(options.radius) || options.radius < 0) throw new RangeError("Circular graph layout requires finite center and angle, and nonnegative finite radius.");
  const limits = graphLimits(Object.fromEntries(["maxNodes", "maxEdges"]
    .filter(field => Object.hasOwn(options, field)).map(field => [field, options[field]])));
  const indexed = indexGraphModel(model, limits);
  validateWorkLimit(indexed.work + indexed.nodes.length * 64, "Circular graph layout work");
  const frame = { centerX: options.center[0], centerY: options.center[1], availableRadius: options.radius };
  const nodes = indexed.nodes.map(({ key }, index) => {
    if (indexed.nodes.length === 1 || options.radius === 0) return { key, x: options.center[0], y: options.center[1] };
    const theta = requireFiniteResult(options.startAngle + 360 * (index / indexed.nodes.length), "Circular graph angle");
    const point = polarToCartesian({ theta, radius: options.radius, frame });
    return { key, x: requireFiniteResult(point.x, "Circular graph x"), y: requireFiniteResult(point.y, "Circular graph y") };
  });
  return cloneAndFreeze({ method: "circular", nodes, options: {
    center: options.center, radius: options.radius, startAngle: options.startAngle, ...limits
  } });
}
