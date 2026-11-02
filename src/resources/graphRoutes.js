import { createRouteLedger, ROUTE_EXECUTION_MAXIMA } from "../grammar/graph/routes/execution.js";
import { createRouteDeadline, drainRouteStages } from "./routeStages.js";
import { ChartProgram } from "../core/ChartProgram.js";
import { actionSource } from "../core/action.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../core/validation.js";
import { annotateError } from "../core/diagnostics.js";
import { normalizeEdgeRouteRequest, permitsRouteDeadline } from "../materialization/graph/routeRequest.js";
import { edgeRouteJobStages, edgeRouteJob, completedEdgeRouteResource } from "../materialization/graph/routeResource.js";
import { edgeRouteResourceHandler } from "../materialization/graph/routeState.js";
import { getBuiltinResourceKindHandler } from "../materialization/resourceKinds.js";
import { validateResourceGraph } from "../materialization/resourceState.js";
import { computeRouteJob } from "../grammar/graph/routes/job.js";
import { computePreparedRoute, isGraphRouteExecutor } from "./graphRouteExecutor.js";

const prepared = new WeakMap();
const planners = new WeakMap();

// Full assembly binds only this native planning function, once per exact class.
// This lookup is capability wiring; job/result/prepared authority stays below.
export function registerGraphRoutePlanner(ProgramClass, planner) {
  if (typeof ProgramClass !== "function" || ProgramClass.prototype === undefined || typeof planner !== "function") throw new TypeError("Native route planning requires a program constructor and planner.");
  if (planners.has(ProgramClass)) throw new Error("Native route planning is already registered for this constructor.");
  planners.set(ProgramClass, planner);
}
const active = signal => { if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal); };

export async function prepareGraphEdgeRoutes(program, request, host) {
  const started = performance.now();
  if (!(program instanceof ChartProgram) || getBuiltinResourceKindHandler(program.constructor, "edge-route")?.validateStored !== edgeRouteResourceHandler.validateStored || !planners.has(program.constructor)) throw new TypeError("Route preparation requires a Full route-authoring program.");
  request = Object.assign(Object.create(null), ownRecord(request, "Route preparation request"));
  let { kind, ...args } = request;
  if (!["create", "edit"].includes(kind)) throw new TypeError("Route preparation kind must be create or edit.");
  host = Object.assign(Object.create(null), ownRecord(host, "Route preparation host"));
  const deadline = Object.hasOwn(host, "deadlineMs") && permitsRouteDeadline(program, args, kind === "edit");
  rejectUnknownProperties(host, deadline ? ["requestToken", "signal", "executor", "deadlineMs"] : ["requestToken", "signal", "executor"], "route preparation host");
  const { requestToken, signal, executor, deadlineMs } = host;
  if (typeof requestToken !== "string" || !requestToken) throw new TypeError("Route preparation requires a nonempty requestToken.");
  validateWorkLimit(requestToken.length, "Route request token length");
  if (executor !== undefined && !isGraphRouteExecutor(executor)) throw new TypeError("Route executor must be created by createGraphRouteExecutor.");
  active(signal);
  // V2 requires deadlineMs. Record the original preflight charges before its
  // normalized intent is available, then admit them against that sole policy.
  const initial = deadline ? createRouteLedger({ policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA }, signal) : undefined;
  validateResourceGraph(program, program.constructor, initial === undefined ? undefined : { ledger: initial, signal });
  const { resolved, previous } = normalizeEdgeRouteRequest(program, args, kind === "edit");
  const { graph, layout, intent, hierarchy, hierarchyLayout } = resolved;
  const bounded = Object.hasOwn(intent.options, "execution");
  if (!bounded) rejectUnknownProperties(host, ["requestToken", "signal", "executor"], "route preparation host");
  request = undefined; args = undefined; host = undefined;
  let job, resource, plan, accounting;
  if (bounded) {
    if (executor === undefined) throw new TypeError("Bounded routes require an explicit worker executor.");
    const lifetime = createRouteDeadline(signal, deadlineMs, started);
    try {
      lifetime.check();
      const execution = intent.options.execution, ledger = createRouteLedger(execution, lifetime.signal, initial?.diagnostics());
      const scope = { execution, ledger, signal: lifetime.signal };
      job = await drainRouteStages(edgeRouteJobStages(program, graph, layout, intent, hierarchy, hierarchyLayout, scope), lifetime.signal, lifetime.check);
      const completion = await computePreparedRoute(executor, job, { signal: lifetime.signal, deadlineMs }, scope);
      lifetime.check();
      resource = completedEdgeRouteResource(resolved, job, completion, { ...scope, includeComputation: false });
      plan = planners.get(program.constructor)(program, resource, previous, scope);
      lifetime.check(); accounting = ledger.diagnostics();
    } finally { lifetime.close(); }
  } else {
    job = edgeRouteJob(program, graph, layout, intent, hierarchy, hierarchyLayout);
    const completion = await (executor === undefined ? computeRouteJob(job, signal) : executor.compute(job, { signal }));
    active(signal);
    resource = completedEdgeRouteResource(resolved, job, completion);
  }
  const handle = cloneAndFreeze({ kind: "edge-route-preparation", request: { kind, id: resource.id }, inputHash: job.inputHash });
  prepared.set(handle, { base: program, constructor: program.constructor, kind, resource, requestToken, signal, plan, accounting });
  return handle;
}

export function readPreparedGraphEdgeRoutes(program, handle, requestToken, kind) {
  const result = prepared.get(handle);
  if (result === undefined) throw new TypeError("Expected an authentic prepared edge route.");
  if (result.base !== actionSource(program) || result.constructor !== program.constructor || result.requestToken !== requestToken || result.kind !== kind) throw annotateError(new Error("Prepared edge route belongs to a different receiver, token or action."), { code: "stale-result" });
  active(result.signal);
  const scope = result.accounting === undefined ? undefined : { execution: result.resource.options.options.execution,
    ledger: createRouteLedger(result.resource.options.options.execution, result.signal, result.accounting), signal: result.signal };
  return { resource: result.resource, plan: result.plan, scope };
}
