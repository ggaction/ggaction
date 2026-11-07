import { cloneAndFreeze } from "../core/immutable.js";
import { requireClosedProgramState } from "../core/programState.js";
import { projectGraphAnimationState } from "../materialization/animation/graph.js";
import { projectAnimationEndpoint } from "./endpoints.js";
import { registerNativeGraphPresentationFrame } from "./frameProvenance.js";

// Only the Full builtin reader invokes this native baseline preparation. Native
// graph geometry is read through its existing owner, never rebuilt from pixels.
export function prepareNativeGraphPresentation(program) {
  requireClosedProgramState(program, "Graph presentation");
  const endpoint = projectAnimationEndpoint(program), graphs = projectGraphAnimationState(program, endpoint);
  const frame = cloneAndFreeze({ graphicSpec: endpoint.graphicSpec, scene: endpoint.scene, progress: 0, decisions: [] });
  return registerNativeGraphPresentationFrame(frame, program, endpoint, graphs);
}
