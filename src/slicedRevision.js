import { invokeActionStages } from "./core/action.js";
import { cloneAndFreeze, isPlainObject } from "./core/immutable.js";
import { normalizeSliceOptions } from "./core/sliceOptions.js";
import { drainTimeSlicedStages } from "./resources/routeStages.js";

const plainData = args => isPlainObject(args) &&
  Object.values(Object.getOwnPropertyDescriptors(args)).every(descriptor => Object.hasOwn(descriptor, "value"));

// The same revision as program.reviseData(args), run in host turns no longer
// than one row batch past `sliceMs`. Both the preview and the actual pass of
// the action run as stages; cancellation rejects and leaves `program` as is.
// Plain data arguments are copied in the first slice, before any host turn, so
// caller changes while the promise is pending cannot reach the revision. Any
// other arguments go to the action unchanged and fail its own checks.
export async function reviseDataInSlices(program, args, options) {
  const { sliceMs, signal } = normalizeSliceOptions(options, "reviseDataInSlices");
  if (typeof program?.reviseData !== "function") throw new TypeError("reviseDataInSlices requires a chart program.");
  let input = args;
  if (plainData(args)) { try { input = cloneAndFreeze(args); } catch { input = args; } }
  return drainTimeSlicedStages(invokeActionStages(program, program.reviseData, input), sliceMs, signal);
}
