import { ownArray, ownRecord } from "../../core/ownData.js";
import { MAX_GENERATED_ITEMS, rejectUnknownProperties, validateGeneratedItemLimit,
  validateNonNegativeFinite, validatePositiveFinite } from "../../core/validation.js";

// Scheduling is independent of clocks, rendering, and sampling. A terminal
// off-grid frame must be requested explicitly instead of changing the cadence.
export function animationFrameTimes(durationMs, options) {
  validateNonNegativeFinite(durationMs, "Animation duration");
  ownRecord(options, "Animation frame export options");
  rejectUnknownProperties(options, ["timesMs", "fps"], "animation frame export");
  const explicit = Object.hasOwn(options, "timesMs");
  if (explicit === Object.hasOwn(options, "fps")) {
    throw new TypeError("Animation frame export requires exactly one of timesMs or fps.");
  }
  if (explicit) {
    const times = options.timesMs;
    ownArray(times, "Animation frame times");
    validateGeneratedItemLimit(times.length, "Animation frame count");
    if (times.length === 0) throw new RangeError("Animation frame times must not be empty.");
    for (let index = 0; index < times.length; index++) {
      const time = times[index];
      if (!Number.isFinite(time) || time < 0 || time > durationMs || index > 0 && time <= times[index - 1]) {
        throw new RangeError("Animation frame times must be sorted, unique and within the duration.");
      }
    }
    return Object.freeze(times.map(time => time === 0 ? 0 : time));
  }
  const fps = validatePositiveFinite(options.fps, "Animation frame fps");
  // Test the first disallowed index before allocation using the exact same
  // arithmetic as generated times. Counting duration*fps can overflow or round
  // an endpoint to the wrong side of its interval.
  if (MAX_GENERATED_ITEMS / fps * 1000 <= durationMs) {
    validateGeneratedItemLimit(MAX_GENERATED_ITEMS + 1, "Animation frame count");
  }
  const times = [];
  for (let index = 0; index < MAX_GENERATED_ITEMS; index++) {
    const time = index / fps * 1000;
    if (time > durationMs) break;
    times.push(time);
  }
  return Object.freeze(times);
}
