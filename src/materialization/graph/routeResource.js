import { cloneAndFreeze } from "../../core/immutable.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { createRouteJobStages, createRouteJob, computeRouteJob, computeRouteJobWithLedger, validateRouteJob } from "../../grammar/graph/routes/job.js";
import { validateRouteResult, validateRouteResultStages } from "../../grammar/graph/routes/result.js";
import { drainStages } from "../../core/stages.js";
import { resolveRouteInput } from "./routeInput.js";
import { activeRouteReplay } from "./routeReplay.js";

export function edgeRouteJob(program, graph, layout, intent, hierarchy, hierarchyLayout, scope) {
  return createRouteJob(resolveRouteInput(program, graph, layout, intent, hierarchy, hierarchyLayout),
    intent.coordinateSpace === "screen" ? resolveGraphicBounds(program) : null, scope);
}

export function* edgeRouteJobStages(program, graph, layout, intent, hierarchy, hierarchyLayout, scope) {
  return yield* createRouteJobStages(resolveRouteInput(program, graph, layout, intent, hierarchy, hierarchyLayout),
    intent.coordinateSpace === "screen" ? resolveGraphicBounds(program) : null, scope);
}

export function edgeRouteSourceRows(graph, hierarchy) {
  return [...graph.provenance.sourceRows, ...(hierarchy?.provenance.sourceRows ?? [])];
}

// Bounded routes outside a prepared invocation fail with this exact requirement;
// broad fitting catches report it instead of treating it as a geometry failure.
const requirements = new WeakSet();
export const isPreparedRouteRequirement = error => error !== null && typeof error === "object" && requirements.has(error);

export function createEdgeRouteResource({ id, revision = 0, program, graph, layout, intent, hierarchy, hierarchyLayout, completion }) {
  if (Object.hasOwn(intent.options, "execution") && completion === undefined) {
    const error = new TypeError("Bounded routes require prepareGraphEdgeRoutes and authentic prepared application.");
    requirements.add(error);
    throw error;
  }
  const job = edgeRouteJob(program, graph, layout, intent, hierarchy, hierarchyLayout);
  return completedEdgeRouteResource({ id, revision, graph, hierarchy }, job, completion ?? computeRouteJob(job));
}

export function completedEdgeRouteResource(resolved, jobInput, completion, scope) {
  return drainStages(completedEdgeRouteResourceStages(resolved, jobInput, completion, scope));
}

// A bounded completion is checked in stages that yield between batches.
export function* completedEdgeRouteResourceStages({ id, revision = 0, graph, hierarchy }, jobInput, completion, scope) {
  const job = validateRouteJob(jobInput);
  const checked = job.schemaVersion === 2 ? yield* validateRouteResultStages(job, completion, scope) : validateRouteResult(job, completion, scope);
  const { options: _options, ...computed } = checked.result;
  return cloneAndFreeze({ kind: "edge-route", id, revision, algorithmVersion: job.schemaVersion === 2 ? "2" : "1", ownership: { mode: "authored" },
    inputs: job.inputs, options: job.intent,
    result: { viewport: job.viewport, inputHash: checked.inputHash, resultHash: checked.resultHash, ...computed },
    provenance: { origin: "inferred", sourceRows: edgeRouteSourceRows(graph, hierarchy) } });
}

// A native revision retains its exact resource intent and references across the
// worker suspension. The ordinary synchronous path never yields or accepts v2.
// Within an exact prepared native invocation, a synchronous step receives its
// bounded completions from that invocation's ordered replay instead.
export function* createEdgeRouteResourceStages(resolved, scope) {
  const bounded = Object.hasOwn(resolved.intent.options, "execution");
  const replay = scope === undefined && bounded ? activeRouteReplay() : undefined;
  if (scope === undefined && replay === undefined) return createEdgeRouteResource(resolved);
  scope ??= replay.scope;
  const { program, graph, layout, intent, hierarchy, hierarchyLayout } = resolved;
  const jobScope = scope.routeJobScope?.() ?? scope;
  const job = bounded
    ? yield* edgeRouteJobStages(program, graph, layout, intent, hierarchy, hierarchyLayout, jobScope)
    : edgeRouteJob(program, graph, layout, intent, hierarchy, hierarchyLayout, jobScope);
  const completion = !bounded ? computeRouteJobWithLedger(job, jobScope.signal, jobScope.ledger)
    : replay !== undefined ? replay.take(job, resolved.id) : yield Object.freeze({ kind: "edge-route-computation", job, scope: jobScope });
  scope.ledger.check();
  const resource = yield* completedEdgeRouteResourceStages(resolved, job, completion, { ...jobScope, includeComputation: false });
  scope.retainResult?.(resource);
  return resource;
}
