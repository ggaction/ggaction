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
  if(input.guides!==undefined&&(!Array.isArray(input.guides)||input.guides.length!==frame.scene.nodes.length))throw new TypeError("Guide frame state must follow its exact node order.");
  if(input.polars!==undefined&&(!Array.isArray(input.polars)||input.polars.length!==frame.scene.nodes.length))throw new TypeError("Polar frame state must follow its exact node order.");
  if(input.cartesian!==undefined && (!Array.isArray(input.cartesian)||input.cartesian.length!==frame.scene.nodes.length))throw new TypeError("Cartesian frame state must follow its exact node order.");
  if (input.graphs !== undefined && (!Array.isArray(input.graphs.items) || input.graphs.items.length !== frame.scene.nodes.length)) {
    throw new TypeError("Animation frame graph items must follow its exact node order.");
  }
  if(input.geotexts!==undefined&&(!Array.isArray(input.geotexts.items)||input.geotexts.items.length!==frame.scene.nodes.length))throw new TypeError("Geographic Text items must follow exact node order.");
  if(input.geos!==undefined&&(!Array.isArray(input.geos.items)||input.geos.items.length!==frame.scene.nodes.length))throw new TypeError("Animation Geo items must follow the exact node order.");
  if (input.partitions !== undefined && (!Array.isArray(input.partitions.items) || input.partitions.items.length !== frame.scene.nodes.length)) {
    throw new TypeError("Animation partition items must follow the exact node order.");
  }
  frames.set(frame, Object.freeze({ planIdentity: plan.identity, timeMs: input.timeMs,
    ...(input.positions === undefined ? {} : { positions: cloneAndFreeze(input.positions) }),
    ...(input.geotexts === undefined ? {} : { geotexts: cloneAndFreeze(input.geotexts) }),
    ...(input.geos === undefined ? {} : { geos: cloneAndFreeze(input.geos) }),
    ...(input.graphs === undefined ? {} : { graphs: cloneAndFreeze(input.graphs) }),
    ...(input.guides === undefined ? {} : { guides: cloneAndFreeze(input.guides) }),
    ...(input.polars === undefined ? {} : { polars: cloneAndFreeze(input.polars) }),
    ...(input.cartesian === undefined ? {} : { cartesian: cloneAndFreeze(input.cartesian) }),
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

// A private forward-materialized graph view retains the same flat native source
// authority and other family meanings. It never retains the previous frame.
export function registerGraphPresentationFrame(frame, original, endpoint, graphs) {
  const source = frames.get(original);
  if (!isOwned(frame) || frames.has(frame) || source?.native === undefined || !isOwned(endpoint) || !isOwned(graphs) ||
      endpoint.scene !== frame.scene || endpoint.graphicSpec !== frame.graphicSpec ||
      endpoint.identities !== source.endpoint.identities || endpoint.backgrounds !== source.endpoint.backgrounds ||
      frame.scene.nodes.length !== original.scene.nodes.length || graphs.items.length !== frame.scene.nodes.length) {
    throw new TypeError("Graph presentation requires an authentic native frame and its exact forward-materialized endpoint.");
  }
  frames.set(frame, Object.freeze({ ...source, endpoint, graphs }));
  return frame;
}

export function animationFrameProvenance(frame) { return frames.get(frame); }

// An exact native graph baseline is prepared by the builtin native reader. No
// arbitrary scene or externally cloned frame acquires native source authority.
export function registerNativeGraphPresentationFrame(frame, program, endpoint, graphs) {
  if (!isOwned(frame) || frames.has(frame) || !isOwned(endpoint) || !isOwned(graphs) ||
      frame.graphicSpec !== program.graphicSpec || endpoint.graphicSpec !== frame.graphicSpec ||
      endpoint.scene !== frame.scene || endpoint.identities.length !== frame.scene.nodes.length ||
      graphs.items.length !== frame.scene.nodes.length) {
    throw new TypeError("Native graph presentation requires its exact owned program and projected endpoint.");
  }
  frames.set(frame, Object.freeze({ planIdentity: Object.freeze({}), timeMs: 0,
    positions: cloneAndFreeze(Array(frame.scene.nodes.length).fill(null)), endpoint, graphs,
    native: nativeSource(program, endpoint) }));
  return frame;
}
