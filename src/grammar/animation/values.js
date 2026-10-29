import { linearLight, encodedLight } from "../linearColor.js";
import { ownArray } from "../../core/ownData.js";
import { validateNonNegativeFinite, validateUnitInterval } from "../../core/validation.js";

export const ANIMATION_COLOR_VERSION = "premultiplied-linear-srgb@1";

function finite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
}

export function transitionProgress(timeMs, durationMs) {
  finite(timeMs, "Animation time");
  validateNonNegativeFinite(durationMs, "Animation duration");
  return durationMs === 0 ? (timeMs < 0 ? 0 : 1) : Math.min(1, Math.max(0, timeMs / durationMs));
}

export function easeProgress(progress, easing = "cubic-in-out") {
  validateUnitInterval(progress, "Animation progress");
  if (easing === "linear") return progress;
  if (easing !== "cubic-in-out") throw new TypeError("Animation easing must be linear or cubic-in-out.");
  return progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

export function interpolateNumber(from, to, progress) {
  finite(from, "Animation source number");
  finite(to, "Animation target number");
  validateUnitInterval(progress, "Animation progress");
  if (progress === 0) return from;
  if (progress === 1) return to;
  // A convex combination avoids overflowing the endpoint difference.
  return from * (1 - progress) + to * progress;
}

export function interpolatePositiveScale(from, to, progress) {
  finite(from, "Animation source scale");
  finite(to, "Animation target scale");
  if (from <= 0 || to <= 0) throw new RangeError("Animation scale endpoints must be positive.");
  validateUnitInterval(progress, "Animation progress");
  if (progress === 0) return from;
  if (progress === 1) return to;
  return Math.exp(interpolateNumber(Math.log(from), Math.log(to), progress));
}

export function interpolateRotation(from, to, progress) {
  finite(from, "Animation source rotation");
  finite(to, "Animation target rotation");
  validateUnitInterval(progress, "Animation progress");
  if (progress === 0) return from;
  if (progress === 1) return to;
  const turn = 2 * Math.PI;
  let delta = ((to % turn) - (from % turn)) % turn;
  if (delta > Math.PI) delta -= turn;
  else if (delta <= -Math.PI) delta += turn;
  return from + delta * progress;
}

function rgba(value, label) {
  ownArray(value, label);
  if (value.length !== 4) throw new TypeError(`${label} requires four normalized RGBA channels.`);
  for (const channel of value) validateUnitInterval(channel, label);
  return value;
}

// Input and output RGB are normalized sRGB; alpha is linear. Color strings are
// resolved by the owning track planner before entering this numeric kernel.
export function interpolateRGBA(from, to, progress) {
  rgba(from, "Animation source color");
  rgba(to, "Animation target color");
  validateUnitInterval(progress, "Animation progress");
  if (progress === 0) return Object.freeze([...from]);
  if (progress === 1) return Object.freeze([...to]);
  const alpha = interpolateNumber(from[3], to[3], progress);
  if (alpha === 0) return Object.freeze([0, 0, 0, 0]);
  return Object.freeze([0, 1, 2].map(index => encodedLight(interpolateNumber(
    linearLight(from[index]) * from[3], linearLight(to[index]) * to[3], progress
  ) / alpha)).concat(alpha));
}
