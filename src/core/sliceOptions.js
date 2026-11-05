import { isPlainObject } from "./immutable.js";

// Options shared by every sliced public call.
export function normalizeSliceOptions(options = {}, label) {
  if (!isPlainObject(options)) throw new TypeError(`${label} options must be a plain object.`);
  const unknown = Object.keys(options).find(key => key !== "sliceMs" && key !== "signal");
  if (unknown !== undefined) throw new TypeError(`Unknown ${label} option "${unknown}".`);
  const sliceMs = options.sliceMs ?? 40, signal = options.signal;
  if (!Number.isSafeInteger(sliceMs) || sliceMs < 1 || sliceMs > 1000) throw new RangeError(`${label} sliceMs must be an integer from 1 to 1000.`);
  if (signal !== undefined && !(signal instanceof AbortSignal)) throw new TypeError(`${label} signal must be an AbortSignal.`);
  return { sliceMs, signal };
}
