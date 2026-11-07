import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { advancePlayback } from "./timing.js";

const keys = ["rate", "repeat", "reducedMotion"];

export function normalizePlaybackOptions(input = {}) {
  ownRecord(input, "Animation playback options");
  rejectUnknownProperties(input, keys, "animation playback options");
  const rate = Object.hasOwn(input, "rate") ? input.rate : 1;
  const repeat = Object.hasOwn(input, "repeat") ? input.repeat : 0;
  const reducedMotion = Object.hasOwn(input, "reducedMotion") ? input.reducedMotion : false;
  advancePlayback({timeMs: 0, durationMs: 0, elapsedMs: 0, rate, iteration: 0, repeat});
  if (typeof reducedMotion !== "boolean") throw new TypeError("Animation reducedMotion must be boolean.");
  return Object.freeze({rate, repeat, reducedMotion});
}

export function serializePlaybackOptions(input) {
  const options = normalizePlaybackOptions(input);
  return Object.freeze({...options, repeat: options.repeat === Infinity ? "infinite" : options.repeat});
}

export function restorePlaybackOptions(input) {
  ownRecord(input, "Stored animation playback options");
  if (Object.keys(input).length !== keys.length || keys.some(key => !Object.hasOwn(input, key))) {
    throw new TypeError("Stored animation playback options require rate, repeat and reducedMotion.");
  }
  if (input.repeat === Infinity) throw new TypeError("Stored infinite repeat must use the string infinite.");
  return normalizePlaybackOptions({...input, repeat: input.repeat === "infinite" ? Infinity : input.repeat});
}
