import { animationSceneLength } from "../core/sceneRows.js";
import { validateWorkLimit } from "../core/validation.js";
import { animationFrameTimes } from "../grammar/animation/frameTimes.js";
import { requireTransitionPlan } from "./planner.js";
import { sampleTransitionWithBudget, withSampleTime } from "./sample.js";

// The schedule estimate cannot predict intermediate clipping/part expansion.
// Keep this collection private to the module entry: no partial batch escapes.
export function collectAnimationFrameViews(times, sample) {
  let work = 0;
  const accountWork = amount => validateWorkLimit(work += amount, "Animation sampled frame export work");
  return Object.freeze(times.map(timeMs => {
    const frame = sample(timeMs, accountWork);
    accountWork(Math.max(1, animationSceneLength(frame.scene)));
    return frame;
  }));
}

export function exportAnimationFrames(input, options) {
  const plan = requireTransitionPlan(input);
  const times = animationFrameTimes(plan.durationMs, options);
  const nodes = Math.max(1, plan.from.scene.nodes.length + plan.to.scene.nodes.length);
  validateWorkLimit(times.length * nodes, "Animation frame export work");
  return collectAnimationFrameViews(times, (timeMs, accountWork) => withSampleTime(sampleTransitionWithBudget(plan, timeMs, accountWork), timeMs, plan));
}
