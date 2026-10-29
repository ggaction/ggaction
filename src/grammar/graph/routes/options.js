import { cloneAndFreeze } from "../../../core/immutable.js";
import { ownArray, ownRecord } from "../../../core/ownData.js";
import { encodeRowKey } from "../../../core/itemIdentity.js";
import { rejectUnknownProperties, validateGeneratedItemLimit } from "../../../core/validation.js";
import { normalizeRouteLimits } from "./budget.js";
import { normalizeHierarchicalRouteOptions } from "./hierarchical.js";
import { normalizeForceRouteOptions } from "./forceDirected.js";
import { normalizeDensityRouteOptions } from "./density.js";
import { normalizeEdgePathOptions } from "./edgePath.js";

export const ROUTE_VERSIONS = Object.freeze({
  hierarchical: "hierarchical@1", "force-directed": "force-directed@1", density: "density-v1", "edge-path": "edge-path@1"
});
const normalizers = Object.freeze({ hierarchical: normalizeHierarchicalRouteOptions,
  "force-directed": normalizeForceRouteOptions, density: normalizeDensityRouteOptions, "edge-path": normalizeEdgePathOptions });

export function normalizeRouteMapping(input, maximum) {
  if (Array.isArray(input)) validateGeneratedItemLimit(input.length, "Route hierarchy mapping", maximum);
  ownArray(input, "Route hierarchy mapping");
  const keys = new Set();
  return input.map(entry => {
    ownRecord(entry, "Route hierarchy mapping entry");
    rejectUnknownProperties(entry, ["nodeKey", "hierarchyKey"], "route hierarchy mapping");
    if (!["nodeKey", "hierarchyKey"].every(key => Object.hasOwn(entry, key))) throw new TypeError("Route mapping requires own nodeKey and hierarchyKey.");
    const key = encodeRowKey(entry.nodeKey, "Route graph key");
    if (Array.isArray(entry.hierarchyKey)) throw new TypeError("Route hierarchy keys must be typed scalars.");
    encodeRowKey(entry.hierarchyKey, "Route hierarchy key");
    if (keys.has(key)) throw new TypeError("Route mapping requires unique graph keys.");
    keys.add(key);
    return { nodeKey: entry.nodeKey, hierarchyKey: entry.hierarchyKey };
  });
}

// Source resource identities live in exact inputs, not in these numeric options.
export function normalizeRouteIntent(method, input = {}, coordinateSpace = "world") {
  if (!Object.hasOwn(normalizers, method)) throw new TypeError("Unsupported edge route method.");
  if (!["world", "screen"].includes(coordinateSpace)) throw new TypeError("Route coordinateSpace must be world or screen.");
  ownRecord(input, "Edge route options");
  if (Object.values(input).some(value => value === undefined || value === null)) throw new TypeError("Edge route options cannot contain null or undefined.");
  const { limits: rawLimits = {}, mapping, ...numeric } = input;
  const limits = normalizeRouteLimits(rawLimits);
  if (method !== "hierarchical" && Object.hasOwn(input, "mapping")) throw new TypeError("Only hierarchical routes use mapping.");
  const options = { ...normalizers[method](numeric), limits,
    ...(method === "hierarchical" ? { mapping: normalizeRouteMapping(mapping, limits.maxNodes) } : {}) };
  return cloneAndFreeze({ method, coordinateSpace, options });
}

export function routeNumericOptions(intent) {
  const { limits: _limits, mapping: _mapping, ...options } = intent.options;
  return options;
}
