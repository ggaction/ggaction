import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { graphLimits } from "./model.js";
import { normalizeForceOptions } from "./force.js";
import { GRAPH_LAYOUT_METHODS } from "../../core/vocabulary.js";

export const GRAPH_COORDINATE_FIELDS = Object.freeze(["positions", "initialPositions", "pinned"]);

function coordinates(value, pin) {
  ownArray(value, pin ? "Graph pins" : "Graph positions");
  const fields = pin ? ["key", "fx", "fy"] : ["key", "x", "y"], seen = new Set();
  return value.map(item => {
    ownRecord(item, "Graph coordinate");
    rejectUnknownProperties(item, fields, "graph coordinate");
    if (fields.some(field => !Object.hasOwn(item, field))) throw new TypeError("Graph coordinates require a key and both finite coordinates.");
    const key = encodeRowKey(item.key);
    if (seen.has(key) || !fields.slice(1).every(field => Number.isFinite(item[field]))) throw new TypeError("Graph coordinate keys must be unique and coordinates finite.");
    seen.add(key);
    return { ...item };
  });
}

export function normalizeGraphLayout(method, input = {}) {
  ownRecord(input, "Graph layout options");
  input = Object.assign(Object.create(null), input);
  if (!GRAPH_LAYOUT_METHODS.includes(method)) throw new TypeError("Graph layout method must be fixed, circular or force.");
  if (Object.values(input).some(value => value === undefined || value === null)) throw new TypeError("Graph layout options cannot contain null or undefined.");
  const common = ["maxNodes", "maxEdges"];
  const allowed = method === "fixed" ? ["positions"] : method === "circular" ? ["center", "radius", "startAngle"]
    : ["seed", "iterations", "linkDistance", "repulsion", "collisionRadius", "damping", "center", "componentGap", "initialPositions", "pinned"];
  rejectUnknownProperties(input, [...allowed, ...common], "graph layout");
  const limits = graphLimits(Object.fromEntries(common.filter(key => Object.hasOwn(input, key)).map(key => [key, input[key]])));
  if (method === "fixed") return cloneAndFreeze({ method, options: { positions: coordinates(input.positions, false), ...limits } });
  const center = input.center ?? [0, 0];
  ownArray(center, "Graph layout center");
  if (center.length !== 2 || !center.every(Number.isFinite)) throw new TypeError("Graph layout center requires two finite coordinates.");
  if (method === "circular") {
    const radius = input.radius ?? 100, startAngle = input.startAngle ?? 0;
    if (!Number.isFinite(radius) || radius < 0 || !Number.isFinite(startAngle)) throw new TypeError("Circular layout requires a nonnegative finite radius and finite angle.");
    return cloneAndFreeze({ method, options: { center, radius, startAngle, ...limits } });
  }
  const options = { ...normalizeForceOptions({ seed: 1, iterations: 300, linkDistance: 30, repulsion: 100, collisionRadius: 4,
    damping: .9, componentGap: 16, ...input, center, ...limits }), pinned: coordinates(input.pinned ?? [], true) };
  if (Object.hasOwn(input, "initialPositions")) options.initialPositions = coordinates(input.initialPositions, false);
  return cloneAndFreeze({ method, options });
}

export function graphLayoutKernelOptions(intent, { nodeKeys, retainedCoordinates = [] } = {}) {
  const options = { ...intent.options };
  const active = nodeKeys === undefined ? undefined : new Set(nodeKeys);
  for (const field of GRAPH_COORDINATE_FIELDS) if (Object.hasOwn(options, field)) {
    const encoded = options[field].map(item => ({ ...item, key: encodeRowKey(item.key) }));
    options[field] = active !== undefined && retainedCoordinates.includes(field)
      ? encoded.filter(item => active.has(item.key)) : encoded;
  }
  return options;
}
