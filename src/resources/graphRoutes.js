import { createRouteLedger, createRouteRequestLedger, ROUTE_EXECUTION_MAXIMA } from "../grammar/graph/routes/execution.js";
import { createRouteDeadline, drainRouteStages, drainNativeRouteStages } from "./routeStages.js";
import { ChartProgram } from "../core/ChartProgram.js";
import { actionSource, getWrappedActionMetadata, summarizeArgs } from "../core/action.js";
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
import { createRouteReplay, enterRouteReplay } from "../materialization/graph/routeReplay.js";

const prepared = new WeakMap();
const planners = new WeakMap();
let invocation;

// Full assembly binds only this native planning function, once per exact class.
// This lookup is capability wiring; job/result/prepared authority stays below.
export function registerGraphRoutePlanner(ProgramClass, planner, update) {
  if (typeof ProgramClass !== "function" || ProgramClass.prototype === undefined || typeof planner !== "function") throw new TypeError("Native route planning requires a program constructor and planner.");
  if (planners.has(ProgramClass)) throw new Error("Native route planning is already registered for this constructor.");
  if (update !== undefined) {
    ownRecord(update, "Native route update owner");
    if (Object.keys(update).length !== 4 || typeof update.snapshot !== "function" || typeof update.resolve !== "function" || typeof update.prepare !== "function" || typeof update.apply !== "function") throw new TypeError("Native route update owner requires snapshot, resolve, prepare and apply.");
  }
  planners.set(ProgramClass, { route: planner, update: update === undefined ? undefined : Object.freeze({ ...update }) });
}
const active = signal => { if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal); };

export async function prepareGraphEdgeRoutes(program, request, host) {
  const started = performance.now();
  if (!(program instanceof ChartProgram) || getBuiltinResourceKindHandler(program.constructor, "edge-route")?.validateStored !== edgeRouteResourceHandler.validateStored || !planners.has(program.constructor)) throw new TypeError("Route preparation requires a Full route-authoring program.");
  request = Object.assign(Object.create(null), ownRecord(request, "Route preparation request"));
  let { kind, ...args } = request;
  if (kind === "update") return prepareNativeUpdate(program, args, host, started);
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
      plan = planners.get(program.constructor).route(program, resource, previous, scope);
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

async function prepareNativeUpdate(program, args, host, started) {
  if (program.actionStack.length !== 0) throw new TypeError("Native route preparation requires a completed receiver.");
  rejectUnknownProperties(args, ["edit"], "native route update");
  const owner = planners.get(program.constructor).update;
  if (owner === undefined) throw new TypeError("Native route updates require a registered Full owner.");
  const edit = owner.snapshot(program, args.edit);
  args = undefined;
  if (program.applyGraphEdgeRoutesUpdate !== owner.apply) throw new TypeError("Native route apply action was replaced.");
  const resolved = owner.resolve(program, edit);
  host = Object.assign(Object.create(null), ownRecord(host, "Route preparation host"));
  rejectUnknownProperties(host, ["requestToken", "signal", "executor", "deadlineMs"], "route preparation host");
  const { requestToken, signal, executor, deadlineMs } = host;
  host = undefined;
  if (typeof requestToken !== "string" || !requestToken) throw new TypeError("Route preparation requires a nonempty requestToken.");
  validateWorkLimit(requestToken.length, "Route request token length");
  if (!isGraphRouteExecutor(executor)) throw new TypeError("Bounded routes require an explicit worker executor.");
  const lifetime = createRouteDeadline(signal, deadlineMs, started);
  let handle;
  try {
    const ledger = createRouteRequestLedger(resolved.bounded, lifetime.signal);
    let heldSamples = 0;
    const scope = { ledger, signal: lifetime.signal,
      routeJobScope() {
        const retained = heldSamples;
        return { ledger: { ...ledger, samples: count => ledger.samples(retained + count) }, signal: lifetime.signal };
      },
      retainResult(resource) {
        let count = 0;
        for (const route of resource.result.routes) count += route.controlPoints.length + route.commands.length;
        ledger.samples(heldSamples + count); heldSamples += count;
      } };
    lifetime.check(); validateResourceGraph(program, program.constructor, scope);
    const compute = (job, jobScope) => computePreparedRoute(executor, job, { signal: lifetime.signal, deadlineMs }, jobScope);
    if (resolved.replayed) {
      handle = await prepareReplayedUpdate(program, edit, resolved, owner, { ledger, lifetime, requestToken, signal, compute });
      return handle;
    }
    const plan = await drainNativeRouteStages(owner.prepare(program, resolved, scope), lifetime, compute);
    lifetime.check();
    handle = cloneAndFreeze({ kind: "edge-route-preparation", request: { kind: "update", action: edit.action, args: summarizeArgs(edit.args) },
      inputHashes: plan.routeEntries.filter(entry => entry.resource.kind === "edge-route").map(entry => entry.resource.result.inputHash) });
    const record = { base: program, constructor: program.constructor, kind: "update", requestToken, signal,
      edit, native: resolved.native, apply: owner.apply, bounded: resolved.bounded, plan, accounting: ledger.diagnostics(),
      preparationScope: { ledger, signal: lifetime.signal } };
    // The original registry owns this unpublished handle. Preflight runs the
    // exact final wrapped path, then discards its candidate program.
    prepared.set(handle, record);
    owner.apply.call(program, { prepared: handle, requestToken });
    lifetime.check();
    record.accounting = ledger.diagnostics(); delete record.preparationScope;
    return handle;
  } catch (error) {
    if (handle !== undefined) prepared.delete(handle);
    throw error;
  } finally { lifetime.close(); }
}

// A replayed action reaches its bounded routes inside one synchronous native
// call. Preparation runs the exact wrapped preflight; when it reaches a job
// that no completion covers yet, that job is computed on the worker and the
// whole preflight runs again from the receiver. Each run is real work and is
// charged; worker samples retained by an abandoned run are released.
async function prepareReplayedUpdate(program, edit, resolved, owner, { ledger, lifetime, requestToken, signal, compute }) {
  const completions = [];
  const handle = cloneAndFreeze({ kind: "edge-route-preparation", request: { kind: "update", action: edit.action, args: summarizeArgs(edit.args) } });
  const record = { base: program, constructor: program.constructor, kind: "update", requestToken, signal, edit, native: resolved.native,
    apply: owner.apply, bounded: resolved.bounded, replayed: true, identity: resolved.identity, plan: { completions } };
  prepared.set(handle, record);
  try {
    while (true) {
      lifetime.check();
      let heldSamples = 0;
      const scope = { ledger, signal: lifetime.signal,
        routeJobScope() {
          const retained = heldSamples;
          return { ledger: { ...ledger, samples: count => ledger.samples(retained + count) }, signal: lifetime.signal };
        },
        retainResult(resource) {
          let count = 0;
          for (const route of resource.result.routes) count += route.controlPoints.length + route.commands.length;
          ledger.samples(heldSamples + count); heldSamples += count;
        } };
      record.preparationScope = scope; record.recording = createRouteReplay(completions, scope, true);
      try { owner.apply.call(program, { prepared: handle, requestToken }); }
      catch (error) {
        if (!record.recording.requested(error)) throw error;
        const job = error.job;
        completions.push(Object.freeze({ inputHash: job.inputHash, completion: await compute(job, scope.routeJobScope()) }));
        continue;
      }
      break;
    }
    lifetime.check();
    Object.freeze(completions);
    record.accounting = ledger.diagnostics(); delete record.preparationScope; delete record.recording;
    const published = cloneAndFreeze({ ...handle, inputHashes: completions.map(entry => entry.inputHash) });
    prepared.delete(handle); prepared.set(published, record);
    return published;
  } catch (error) {
    prepared.delete(handle);
    throw error;
  }
}

export function enterGraphRouteUpdateInvocation(program, args) {
  rejectUnknownProperties(args, ["prepared", "requestToken"], "prepared route update");
  const record = prepared.get(args.prepared);
  if (record === undefined || record.kind !== "update") throw new TypeError("Expected an authentic prepared edge route update.");
  if (record.base !== program || record.constructor !== program.constructor || record.requestToken !== args.requestToken ||
      program[record.edit.action] !== record.native || program.applyGraphEdgeRoutesUpdate !== record.apply) throw annotateError(new Error("Prepared edge route update belongs to a different receiver, token or action."), { code: "stale-result" });
  active(record.signal);
  const scope = record.preparationScope ?? { ledger: createRouteRequestLedger(record.bounded, record.signal, record.accounting), signal: record.signal };
  scope.ledger.check();
  const replay = record.replayed ? record.recording ?? createRouteReplay(record.plan.completions, scope) : undefined;
  const previous = invocation, leaveReplay = replay === undefined ? undefined : enterRouteReplay(replay);
  const current = { record, args, scope, replay, consumed: false, entered: undefined };
  invocation = current;
  return outcome => {
    try {
      if (outcome !== undefined) {
        rejectEmptyReplay(current);
        if (replay === undefined ? !current.consumed : !replay.finished()) throw new TypeError("Prepared native route plan was not consumed.");
        validateResourceGraph(outcome.result, program.constructor, scope);
        scope.ledger.check();
      }
    } finally { leaveReplay?.(); invocation = previous; }
  };
}

// The receiver a nested original action acts for: only the exact entered
// program of this invocation, with the exact prepared handle of its edit.
export function nativeRouteInvocationBase(source, prepared) {
  const current = invocation;
  if (current === undefined || current.entered === undefined || current.entered !== source || current.record.edit.args.prepared !== prepared) return undefined;
  return current.record.base;
}

// The prepared row identity of a replayed revision, readable only inside its
// exact invocation by the native action itself.
export function readNativeRouteRevisionIdentity(program, args, native) {
  const current = invocation;
  if (current === undefined || !current.record.replayed) return undefined;
  if (current.record.native !== native || current.record.edit.args !== args || current.entered !== actionSource(program) ||
      program.constructor !== current.record.constructor) throw new TypeError("Native route identity belongs to a different invocation.");
  return current.record.identity;
}

export function applyPreparedGraphRouteUpdate(program, args) {
  const current = invocation;
  if (current === undefined || current.args !== args || actionSource(program) !== current.record.base) throw new TypeError("Native route apply requires its exact prepared invocation.");
  current.entered = program;
  return current.record.native.call(program, current.record.edit.args);
}

export function readNativeGraphRouteUpdatePlan(program, args, native) {
  const current = invocation;
  if (current === undefined) return undefined;
  if (current.record.native !== native || current.record.edit.args !== args || current.entered !== actionSource(program) ||
      program.constructor !== current.record.constructor || current.consumed) throw new TypeError("Native route plan belongs to a different invocation.");
  current.scope.ledger.check(); current.consumed = true;
  return { plan: current.record.plan, scope: current.scope, base: current.record.base };
}

// A replayed action that reached no bounded route job has nothing to prepare.
function rejectEmptyReplay(current) {
  if (current.replay !== undefined && current.record.plan.completions.length === 0) throw new TypeError(`This resource has no bounded edge route update; use ${current.record.edit.action} directly.`);
}

export function readGraphRouteUpdateTheme(program, { source, metadata }) {
  const current = invocation;
  if (metadata.op !== "applyGraphEdgeRoutesUpdate" || current === undefined) return undefined;
  rejectEmptyReplay(current);
  if (source !== current.record.base || program.constructor !== current.record.constructor || !(current.replay?.finished() ?? current.consumed) ||
      prepared.get(current.args.prepared) !== current.record) throw new TypeError("Native route completion requires its exact prepared invocation.");
  current.scope.ledger.check();
  return getWrappedActionMetadata(current.record.native);
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
