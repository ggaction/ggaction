import { validateWorkLimit } from "../core/validation.js";
import { animationFrameTimes } from "../grammar/animation/frameTimes.js";
import { requireTransitionPlan } from "./planner.js";
import { sampleTransition, withSampleTime } from "./sample.js";

export function exportAnimationFrames(input, options) {
  const plan = requireTransitionPlan(input);
  const times = animationFrameTimes(plan.durationMs, options);
  const nodes = Math.max(1, plan.from.scene.nodes.length + plan.to.scene.nodes.length);
  validateWorkLimit(times.length * nodes, "Animation frame export work");
  return Object.freeze(times.map(timeMs => withSampleTime(sampleTransition(plan, timeMs), timeMs, plan)));
}
