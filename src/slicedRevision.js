import { invokeActionStages } from "./core/action.js";
import { normalizeSliceOptions } from "./core/sliceOptions.js";
import { drainTimeSlicedStages } from "./resources/routeStages.js";

// The same revision as program.reviseData(args), run in host turns no longer
// than one row batch past `sliceMs`. Both the preview and the actual pass of
// the action run as stages; cancellation rejects and leaves `program` as is.
export async function reviseDataInSlices(program, args, options) {
  const { sliceMs, signal } = normalizeSliceOptions(options, "reviseDataInSlices");
  if (typeof program?.reviseData !== "function") throw new TypeError("reviseDataInSlices requires a chart program.");
  return drainTimeSlicedStages(invokeActionStages(program, program.reviseData, args), sliceMs, signal);
}
