import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonNegativeFinite } from "../../core/validation.js";

export const ANIMATION_TIMING_VERSION = "bounded-playback-clock@1";

// Pure elapsed-time arithmetic for an injected clock. Repeat counts additional
// iterations; exact boundaries retain the endpoint until time moves again.
export function advancePlayback(input) {
  ownRecord(input, "Animation playback state");
  rejectUnknownProperties(input, ["timeMs", "durationMs", "elapsedMs", "rate", "iteration", "repeat"], "animation playback state");
  const { timeMs, durationMs, elapsedMs, rate, iteration, repeat } = input;
  validateNonNegativeFinite(durationMs, "Animation duration");
  validateNonNegativeFinite(elapsedMs, "Animation elapsed time");
  if (!Number.isFinite(timeMs) || timeMs < 0 || timeMs > durationMs) throw new RangeError("Animation time must lie within its duration.");
  if (!Number.isFinite(rate)) throw new TypeError("Animation rate must be finite.");
  if (!Number.isSafeInteger(iteration) || iteration < 0 ||
      !(repeat === Infinity || Number.isSafeInteger(repeat) && repeat >= 0) || iteration > repeat) {
    throw new RangeError("Animation iteration and repeat require valid nonnegative counts.");
  }
  const result = (time, index, finished) => Object.freeze({ timeMs: time, iteration: index, finished });
  if (rate === 0) return result(timeMs, iteration, false);
  if (durationMs === 0) return result(0, iteration, true);
  const forward = rate > 0, end = forward ? durationMs : 0;
  const remaining = repeat - iteration;
  const available = forward ? durationMs - timeMs : timeMs;
  let distance = elapsedMs * Math.abs(rate);
  if (!Number.isFinite(distance)) {
    // Divide before multiplying when elapsed * rate overflows. A large finite
    // duration can still mean only two iterations, even for extreme inputs.
    const beyond = elapsedMs / durationMs * Math.abs(rate) - available / durationMs;
    const cycles = Math.ceil(beyond);
    if (cycles > remaining) return result(end, repeat, true);
    if (!Number.isSafeInteger(iteration + cycles)) throw new RangeError("Animation iteration count exceeds the supported limit.");
    const phase = beyond % 1 || 1;
    return result(forward ? durationMs * phase : durationMs * (1 - phase),
      iteration + cycles, phase === 1 && cycles === remaining);
  }
  if (distance <= available) {
    return result(distance === available ? end : timeMs + (forward ? distance : -distance),
      iteration, distance === available && remaining === 0);
  }
  distance -= available;
  const cycles = Math.ceil(distance / durationMs);
  if (cycles > remaining) return result(end, repeat, true);
  if (!Number.isSafeInteger(iteration + cycles)) throw new RangeError("Animation iteration count exceeds the supported limit.");
  const phase = distance % durationMs || durationMs;
  return result(forward ? phase : durationMs - phase, iteration + cycles,
    phase === durationMs && cycles === remaining);
}
