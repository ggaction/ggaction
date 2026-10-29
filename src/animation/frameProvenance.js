import { cloneAndFreeze, isOwned } from "../core/immutable.js";

const plans = new WeakMap();
const frames = new WeakMap();

function nativeSource(endpoint, projected) {
  if (endpoint === undefined) return undefined;
  const sampled = frames.get(endpoint);
  if (sampled !== undefined) return sampled.native;
  if (projected === undefined) throw new TypeError("Native provenance requires its exact projected endpoint.");
  const nodes = projected.scene.nodes.map((node, index) => {
    const origin = Object.freeze({ program: endpoint, index });
    return Object.freeze({ origin, metrics: Object.freeze(Array(node.type === "weighted-blend" ? node.properties.sources.length : 1).fill(origin)) });
  });
  return Object.freeze({ nodes: Object.freeze(nodes), owners: Object.freeze([endpoint]), placement: endpoint });
}

// Native source associations are flattened when a plan is created. A sampled
// endpoint never keeps its earlier plan, controller, or endpoint frame alive.
export function registerAnimationPlan(plan, endpoints) {
  if (!isOwned(plan) || plans.has(plan)) throw new TypeError("Animation plan provenance requires one owned plan.");
  plans.set(plan, Object.freeze({ identity: Object.freeze({}),
    from: nativeSource(endpoints.from, plan.from), to: nativeSource(endpoints.to, plan.to),
    directOwners: Object.freeze([endpoints.from, endpoints.to].filter(value => value !== undefined && !frames.has(value))) }));
  return plan;
}

export function animationPlanProvenance(plan) { return plans.get(plan); }

export function registerAnimationFrame(frame, input) {
  const plan = plans.get(input.plan);
  if (!isOwned(frame) || frames.has(frame) || plan === undefined || !Number.isFinite(input.timeMs)) {
    throw new TypeError("Animation frame provenance requires one owned sampled frame and finite time.");
  }
  if (input.positions !== undefined && (!Array.isArray(input.positions) || input.positions.length !== frame.scene.nodes.length)) {
    throw new TypeError("Animation frame positions must follow its exact node order.");
  }
  if (input.graphs !== undefined && (!Array.isArray(input.graphs.items) || input.graphs.items.length !== frame.scene.nodes.length)) {
    throw new TypeError("Animation frame graph items must follow its exact node order.");
  }
  if (input.partitions !== undefined && (!Array.isArray(input.partitions.items) || input.partitions.items.length !== frame.scene.nodes.length)) {
    throw new TypeError("Animation partition items must follow the exact node order.");
  }
  frames.set(frame, Object.freeze({ planIdentity: plan.identity, timeMs: input.timeMs,
    ...(input.positions === undefined ? {} : { positions: cloneAndFreeze(input.positions) }),
    ...(input.graphs === undefined ? {} : { graphs: cloneAndFreeze(input.graphs) }),
    ...(input.partitions === undefined ? {} : { partitions: cloneAndFreeze(input.partitions) }),
    ...(input.meaning === undefined ? {} : { endpoint: input.meaning.endpoint, native: input.meaning.native }) }));
  return frame;
}

// A time-labelled view shares already-captured meaning, never the original plan.
export function registerAnimationFrameView(frame, original, timeMs) {
  const source = frames.get(original);
  if (!isOwned(frame) || frames.has(frame) || !Number.isFinite(timeMs) || source === undefined) throw new TypeError("Animation frame view requires authentic meaning and finite time.");
  frames.set(frame, Object.freeze({ ...source, timeMs }));
  return frame;
}

export function animationFrameProvenance(frame) { return frames.get(frame); }
