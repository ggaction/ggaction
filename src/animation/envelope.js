import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties } from "../core/validation.js";
import { serializePlaybackOptions, restorePlaybackOptions } from "../grammar/animation/playbackOptions.js";
import { exportTransitionPlan, restoreTransitionPlan } from "./planner.js";
import { encodeAnimationEnvelope, decodeAnimationEnvelope } from "./envelopeCodec.js";

export function serializeAnimation(plan, options = {}) {
  const playback = serializePlaybackOptions(options);
  return encodeAnimationEnvelope({ plan: exportTransitionPlan(plan), playback });
}

export function deserializeAnimation(text) {
  const payload = decodeAnimationEnvelope(text);
  ownRecord(payload, "Animation payload");
  rejectUnknownProperties(payload, ["plan", "playback"], "animation payload");
  if (!Object.hasOwn(payload, "plan") || !Object.hasOwn(payload, "playback")) {
    throw new TypeError("Animation payload requires plan and playback.");
  }
  const playback = restorePlaybackOptions(payload.playback);
  const plan = restoreTransitionPlan(payload.plan);
  return Object.freeze({ plan, playback });
}
