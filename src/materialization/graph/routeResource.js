import { cloneAndFreeze } from "../../core/immutable.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { createRouteJob, computeRouteJob } from "../../grammar/graph/routes/job.js";
import { validateRouteResult } from "../../grammar/graph/routes/result.js";
import { resolveRouteInput } from "./routeInput.js";

export function edgeRouteJob(program, graph, layout, intent, hierarchy, hierarchyLayout) {
  return createRouteJob(resolveRouteInput(program, graph, layout, intent, hierarchy, hierarchyLayout),
    intent.coordinateSpace === "screen" ? resolveGraphicBounds(program) : null);
}

export function edgeRouteSourceRows(graph, hierarchy) {
  return [...graph.provenance.sourceRows, ...(hierarchy?.provenance.sourceRows ?? [])];
}

export function createEdgeRouteResource({ id, revision = 0, program, graph, layout, intent, hierarchy, hierarchyLayout, completion }) {
  const job = edgeRouteJob(program, graph, layout, intent, hierarchy, hierarchyLayout);
  const checked = validateRouteResult(job, completion ?? computeRouteJob(job));
  const { options: _options, ...computed } = checked.result;
  return cloneAndFreeze({ kind: "edge-route", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: job.inputs, options: job.intent,
    result: { viewport: job.viewport, inputHash: checked.inputHash, resultHash: checked.resultHash, ...computed },
    provenance: { origin: "inferred", sourceRows: edgeRouteSourceRows(graph, hierarchy) } });
}
