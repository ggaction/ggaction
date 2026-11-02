import { computeRouteJobStages } from "../grammar/graph/routes/job.js";
import { drainRouteStages } from "./routeStages.js";

export function computeGraphEdgeRoutesAsync(job, signal) {
  // drain advances synchronously to the first immutable yield before awaiting.
  return drainRouteStages(computeRouteJobStages(job, signal), signal);
}
