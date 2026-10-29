import { cloneAndFreeze, isOwned } from "../core/immutable.js";

const plans = new WeakMap();
const frames = new WeakMap();

// Runtime associations only. Native endpoints and sampled meaning never become
// another program state or part of the serializable concrete frame.
export function registerAnimationPlan(plan, endpoints) {
  if (!isOwned(plan) || plans.has(plan)) throw new TypeError("Animation plan provenance requires one owned plan.");
  plans.set(plan, Object.freeze({ from: endpoints.from, to: endpoints.to }));
  return plan;
}

export function animationPlanProvenance(plan) { return plans.get(plan); }

export function registerAnimationFrame(frame, input) {
  if (!isOwned(frame) || frames.has(frame) || !isOwned(input.plan) || !Number.isFinite(input.timeMs)) {
    throw new TypeError("Animation frame provenance requires one owned sampled frame and finite time.");
  }
  if (input.positions !== undefined && (!Array.isArray(input.positions) || input.positions.length !== frame.scene.nodes.length)) {
    throw new TypeError("Animation frame positions must follow its exact node order.");
  }
  frames.set(frame, Object.freeze({ plan: input.plan, timeMs: input.timeMs,
    ...(input.positions === undefined ? {} : { positions: cloneAndFreeze(input.positions) }) }));
  return frame;
}

export function animationFrameProvenance(frame) { return frames.get(frame); }
