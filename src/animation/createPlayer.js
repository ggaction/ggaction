import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties } from "../core/validation.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { planTransition, requireTransitionPlan, requireTransitionEndpoint, normalizeTransitionOptions, transitionTimeline } from "./planner.js";
import { sampleTransition } from "./sample.js";
import { createPlaybackController } from "./player.js";
import { createTimelineMarkerObserver } from "./timelinePlayback.js";

const optional = (input, keys) => Object.fromEntries(keys.filter(key => Object.hasOwn(input, key)).map(key => [key, input[key]]));

// The controller owns clocks and callback lifetime. This adapter supplies only
// typed preparation and sampling; it never creates another playback state.
export function createAnimationPlayer(input) {
  ownRecord(input, "Animation player");
  rejectUnknownProperties(input, ["plan", "clock", "render", "commit", "onMarker", "rate", "repeat", "reducedMotion"], "animation player");
  if (["plan","clock","render"].some(key=>!Object.hasOwn(input,key))) throw new TypeError("Animation player requires its own plan, clock and render fields.");
  const plan = requireTransitionPlan(input.plan);
  if (Object.hasOwn(input,"onMarker") && typeof input.onMarker !== "function") throw new TypeError("Animation onMarker must be a function.");
  const observer = createTimelineMarkerObserver(Object.hasOwn(input,"onMarker") ? input.onMarker : undefined);
  const sampler = observer.register(time => sampleTransition(plan,time), transitionTimeline(plan));
  const controller = createPlaybackController({ durationMs: plan.durationMs, clock: input.clock,
    render: input.render, sample: sampler, notify: observer.notify,
    ...optional(input, ["commit", "rate", "repeat", "reducedMotion"]) });
  function interrupt(request) {
    ownRecord(request, "Animation interruption");
    rejectUnknownProperties(request, ["to", "options", "rate", "repeat", "reducedMotion"], "animation interruption");
    if (["to","options"].some(key=>!Object.hasOwn(request,key))) throw new TypeError("Animation interruption requires its own target and options.");
    const target = requireTransitionEndpoint(request.to), options = cloneAndFreeze(normalizeTransitionOptions(request.options));
    const playback = optional(request, ["rate", "repeat", "reducedMotion"]);
    controller.interrupt({ durationMs: options.durationMs,
      ...playback,
      createSample(current, initialTime) {
        const reverse = (playback.rate ?? 1) < 0;
        const next = planTransition({ from: reverse ? target : current,
          to: reverse ? current : target, options });
        const start = sampleTransition(next, initialTime);
        if (start !== current) throw new Error("Interrupted transition must preserve the exact captured frame.");
        return observer.register(time => sampleTransition(next, time), transitionTimeline(next));
      }
    });
    return api;
  }
  const controls = ["play", "pause", "seek", "reverse", "setRate", "setRepeat", "cancel"];
  const api = Object.freeze({ ...Object.fromEntries(controls.map(name => [name, (...args) => { controller[name](...args); return api; }])),
    interrupt, dispose() { observer.dispose(); controller.dispose(); }, getState: controller.getState, getFrame: controller.getFrame,
    get finished() { return controller.finished; } });
  return api;
}
