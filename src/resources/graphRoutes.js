import { ChartProgram } from "../core/ChartProgram.js";
import { actionSource } from "../core/action.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../core/validation.js";
import { annotateError } from "../core/diagnostics.js";
import { normalizeEdgeRouteRequest } from "../materialization/graph/routeRequest.js";
import { edgeRouteJob, createEdgeRouteResource } from "../materialization/graph/routeResource.js";
import { edgeRouteResourceHandler } from "../materialization/graph/routeState.js";
import { getBuiltinResourceKindHandler } from "../materialization/resourceKinds.js";
import { validateResourceGraph } from "../materialization/resourceState.js";
import { computeRouteJob } from "../grammar/graph/routes/job.js";
import { isGraphRouteExecutor } from "./graphRouteExecutor.js";

const prepared = new WeakMap();
const active = signal => { if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal); };

export async function prepareGraphEdgeRoutes(program, request, host) {
  if (!(program instanceof ChartProgram) || getBuiltinResourceKindHandler(program.constructor, "edge-route")?.validateStored !== edgeRouteResourceHandler.validateStored) throw new TypeError("Route preparation requires a Full route-authoring program.");
  request = Object.assign(Object.create(null), ownRecord(request, "Route preparation request"));
  const { kind, ...args } = request;
  if (!["create", "edit"].includes(kind)) throw new TypeError("Route preparation kind must be create or edit.");
  host = Object.assign(Object.create(null), ownRecord(host, "Route preparation host"));
  rejectUnknownProperties(host, ["requestToken", "signal", "executor"], "route preparation host");
  const { requestToken, signal, executor } = host;
  if (typeof requestToken !== "string" || !requestToken) throw new TypeError("Route preparation requires a nonempty requestToken.");
  validateWorkLimit(requestToken.length, "Route request token length");
  if (executor !== undefined && !isGraphRouteExecutor(executor)) throw new TypeError("Route executor must be created by createGraphRouteExecutor.");
  active(signal); validateResourceGraph(program);
  const { resolved } = normalizeEdgeRouteRequest(program, args, kind === "edit");
  const { graph, layout, intent, hierarchy, hierarchyLayout } = resolved;
  const job = edgeRouteJob(program, graph, layout, intent, hierarchy, hierarchyLayout);
  const completion = await (executor === undefined ? computeRouteJob(job, signal) : executor.compute(job, { signal }));
  active(signal);
  const resource = createEdgeRouteResource({ ...resolved, completion });
  const handle = cloneAndFreeze({ kind: "edge-route-preparation", request: { kind, id: resource.id }, inputHash: job.inputHash });
  prepared.set(handle, { base: program, kind, resource, requestToken, signal });
  return handle;
}

export function readPreparedGraphEdgeRoutes(program, handle, requestToken, kind) {
  const result = prepared.get(handle);
  if (result === undefined) throw new TypeError("Expected an authentic prepared edge route.");
  if (result.base !== actionSource(program) || result.requestToken !== requestToken || result.kind !== kind) throw annotateError(new Error("Prepared edge route belongs to a different receiver, token or action."), { code: "stale-result" });
  active(result.signal);
  return result.resource;
}
