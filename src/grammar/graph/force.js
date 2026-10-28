import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { requireFiniteResult } from "../numeric.js";
import { graphLimits, indexGraphModel } from "./model.js";
import { layoutGraphFixed } from "./layout.js";

const required = ["seed", "iterations", "linkDistance", "repulsion", "collisionRadius", "damping", "center", "componentGap"];
const finite = value => requireFiniteResult(value, "Force graph layout");

function optionsFor(input) {
  ownRecord(input, "Force graph options");
  rejectUnknownProperties(input, [...required, "initialPositions", "pinned", "maxNodes", "maxEdges"], "force graph");
  if (required.some(key => !Object.hasOwn(input, key))) throw new TypeError("Force graph layout requires all resolved options.");
  if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 0xffffffff) throw new RangeError("Force graph seed must be uint32.");
  if (!Number.isSafeInteger(input.iterations) || input.iterations < 0) throw new RangeError("Force graph iterations must be a nonnegative safe integer.");
  for (const name of ["linkDistance", "repulsion", "collisionRadius", "damping", "componentGap"]) {
    if (!Number.isFinite(input[name]) || input[name] < 0) throw new RangeError(`Force graph ${name} must be finite and nonnegative.`);
  }
  if (input.damping > 1) throw new RangeError("Force graph damping must not exceed one.");
  if (!Array.isArray(input.center) || input.center.length !== 2) throw new TypeError("Force graph center requires two finite coordinates.");
  ownArray(input.center, "Force graph center");
  if (!input.center.every(Number.isFinite)) throw new TypeError("Force graph center requires two finite coordinates.");
  const limits = graphLimits(Object.fromEntries(["maxNodes", "maxEdges"].filter(key => Object.hasOwn(input, key)).map(key => [key, input[key]])));
  return { ...Object.fromEntries(required.map(key => [key, input[key]])), ...limits };
}

function componentsOf(indexed, adjacency) {
  const seen = new Set(), components = [];
  for (let root = 0; root < indexed.nodes.length; root++) {
    if (seen.has(root)) continue;
    const queue = [root]; seen.add(root);
    for (let offset = 0; offset < queue.length; offset++) {
      for (const key of adjacency[queue[offset]].neighbors) {
        const next = indexed.nodeIndexes.get(key);
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    components.push(queue.sort((a, b) => a - b));
  }
  return components;
}

function pinsFor(input, indexed) {
  const value = Object.hasOwn(input, "pinned") ? input.pinned : [];
  if (Array.isArray(value) && value.length > indexed.nodes.length) throw new RangeError("Force graph pins cannot outnumber nodes.");
  ownArray(value, "Force graph pins");
  const pins = new Map();
  for (const pin of value) {
    ownRecord(pin, "Force graph pin");
    rejectUnknownProperties(pin, ["key", "fx", "fy"], "force graph pin");
    if (["key", "fx", "fy"].some(key => !Object.hasOwn(pin, key))) throw new TypeError("Force graph pins require own key, fx and fy.");
    const index = indexed.nodeIndexes.get(pin.key);
    if (index === undefined || pins.has(index)) throw new Error("Force graph pins require unique existing opaque node keys.");
    if (!Number.isFinite(pin.fx) || !Number.isFinite(pin.fy)) throw new TypeError("Force graph pin coordinates must be finite.");
    pins.set(index, pin);
  }
  return pins;
}

function initialize(indexed, options, input) {
  if (Object.hasOwn(input, "initialPositions")) return layoutGraphFixed(indexed.model, input.initialPositions,
    { maxNodes: options.maxNodes, maxEdges: options.maxEdges }).nodes.map(node => ({ ...node, vx: 0, vy: 0 }));
  let state = options.seed;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ state >>> 15, state | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  const spread = Math.max(options.linkDistance, finite(2 * options.collisionRadius), 1);
  return indexed.nodes.map(({ key }) => ({ key,
    x: finite(options.center[0] + (random() - 0.5) * spread),
    y: finite(options.center[1] + (random() - 0.5) * spread), vx: 0, vy: 0 }));
}

function direction(a, b) {
  const dx = finite(b.x - a.x), dy = finite(b.y - a.y), distance = finite(Math.hypot(dx, dy));
  return distance === 0 ? { x: 1, y: 0, distance } : { x: dx / distance, y: dy / distance, distance };
}

function accumulate(forces, source, target, vector, magnitude) {
  const x = finite(vector.x * magnitude), y = finite(vector.y * magnitude);
  forces[source].x = finite(forces[source].x + x); forces[source].y = finite(forces[source].y + y);
  forces[target].x = finite(forces[target].x - x); forces[target].y = finite(forces[target].y - y);
}

function simulate(nodes, components, edges, pins, options) {
  if (nodes.length === 0) return;
  for (let iteration = 0; iteration < options.iterations; iteration++) {
    const forces = nodes.map(() => ({ x: 0, y: 0 }));
    for (const members of components) for (let a = 0; a < members.length; a++) for (let b = a + 1; b < members.length; b++) {
      const source = members[a], target = members[b], vector = direction(nodes[source], nodes[target]);
      // Divide twice instead of squaring a large distance.
      const denominator = Math.max(vector.distance, 1);
      const repulsion = options.repulsion / denominator / denominator;
      const collision = Math.max(0, finite(2 * options.collisionRadius) - vector.distance) / 2;
      accumulate(forces, source, target, vector, -finite(repulsion + collision));
    }
    for (const [source, target] of edges) {
      if (source === target) continue;
      const vector = direction(nodes[source], nodes[target]);
      accumulate(forces, source, target, vector, finite(0.1 * finite(vector.distance - options.linkDistance)));
    }
    nodes.forEach((node, index) => {
      const pin = pins.get(index);
      if (pin) { node.x = pin.fx; node.y = pin.fy; node.vx = 0; node.vy = 0; return; }
      node.vx = finite(finite(node.vx + forces[index].x) * options.damping);
      node.vy = finite(finite(node.vy + forces[index].y) * options.damping);
      node.x = finite(node.x + node.vx); node.y = finite(node.y + node.vy);
    });
  }
}

function boundsOf(nodes, members, radius) {
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const index of members) {
    const node = nodes[index];
    left = Math.min(left, finite(node.x - radius)); right = Math.max(right, finite(node.x + radius));
    top = Math.min(top, finite(node.y - radius)); bottom = Math.max(bottom, finite(node.y + radius));
  }
  return { left, right, top, bottom };
}

function pack(nodes, components, pins, options) {
  const regions = components.map(members => ({ members, pinned: members.some(index => pins.has(index)), bounds: boundsOf(nodes, members, options.collisionRadius) }));
  const fixed = regions.filter(region => region.pinned), movable = regions.filter(region => !region.pinned);
  let width = 0;
  for (const region of movable) width = finite(width + Math.max(1, finite(region.bounds.right - region.bounds.left)));
  width = finite(width + options.componentGap * Math.max(0, movable.length - 1));
  let cursor = fixed.length ? finite(Math.max(...fixed.map(region => region.bounds.right)) + options.componentGap) : finite(options.center[0] - width / 2);
  for (const region of movable) {
    const { left, right, top, bottom } = region.bounds, slot = Math.max(1, finite(right - left));
    const dx = finite(cursor + slot / 2 - finite(left / 2 + right / 2));
    const dy = finite(options.center[1] - finite(top / 2 + bottom / 2));
    for (const index of region.members) { nodes[index].x = finite(nodes[index].x + dx); nodes[index].y = finite(nodes[index].y + dy); }
    region.bounds = boundsOf(nodes, region.members, options.collisionRadius);
    if (region !== movable.at(-1)) cursor = finite(cursor + slot + options.componentGap);
  }
  return { method: "horizontal", gap: options.componentGap, components: regions.map(({ members, pinned, bounds }) => ({ nodeIndices: members, pinned, bounds })) };
}

export function layoutGraphForce(model, input) {
  const options = optionsFor(input), limits = { maxNodes: options.maxNodes, maxEdges: options.maxEdges };
  const indexed = indexGraphModel(model, limits), count = indexed.nodes.length;
  const initialWork = Object.hasOwn(input, "initialPositions")
    ? indexed.work + indexed.nodes.reduce((work, node) => work + 32 + node.key.length * 4, 0) : 0;
  const work = indexed.work + initialWork + count * 96;
  validateWorkLimit(work, "Force graph layout work");
  const pins = pinsFor(input, indexed), components = componentsOf(indexed, model.adjacency);
  const pairs = components.reduce((sum, members) => sum + members.length * (members.length - 1) / 2, 0);
  validateWorkLimit(work + options.iterations * (pairs * 8 + indexed.edges.length * 16 + count * 16), "Force graph layout work");
  const nodes = initialize({ ...indexed, model }, options, input);
  for (const [index, pin] of pins) { nodes[index].x = pin.fx; nodes[index].y = pin.fy; }
  const edges = indexed.edges.map(edge => [indexed.nodeIndexes.get(edge.sourceKey), indexed.nodeIndexes.get(edge.targetKey)]);
  simulate(nodes, components, edges, pins, options);
  const packing = pack(nodes, components, pins, options);
  return cloneAndFreeze({ method: "force", algorithmVersion: "exact-pair-spring@1", options: {
    ...options, ...(Object.hasOwn(input, "initialPositions") ? { initialPositions: input.initialPositions } : {}),
    pinned: [...pins.values()]
  }, nodes: nodes.map(({ key, x, y }) => ({ key, x, y })), packing });
}
