import { ChartProgram } from "../core/ChartProgram.js";
import { requireClosedProgramState } from "../core/programState.js";
import { actionSource } from "../core/action.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../core/validation.js";
import { annotateError } from "../core/diagnostics.js";
import { getBuiltinResourceKindHandler } from "../materialization/resourceKinds.js";
import { validateResourceGraph } from "../materialization/resourceState.js";
import { graphResourceHandler } from "../materialization/graph/state.js";
import { normalizeInferenceRequest } from "../materialization/graph/inferenceRequest.js";
import { inferredGraphJob, completedInferredGraphResource } from "../materialization/graph/inferredResource.js";
import { isGraphInferenceExecutor } from "./graphInferenceExecutor.js";

const prepared = new WeakMap();
const active = signal => { if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal); };

export async function prepareInferredGraphData(program, input, options) {
  const host = Object.assign(Object.create(null), ownRecord(options, "Inference preparation host"));
  rejectUnknownProperties(host, ["requestToken", "signal", "executor"], "inference preparation host");
  const { requestToken, signal, executor } = host; active(signal);
  if (!(program instanceof ChartProgram) || getBuiltinResourceKindHandler(program.constructor, "graph")?.validateStored !== graphResourceHandler.validateStored) throw new TypeError("Inference preparation requires a Full graph-authoring program.");
  requireClosedProgramState(program, "Inference preparation");
  if (typeof requestToken !== "string" || !requestToken) throw new TypeError("Inference preparation requires a nonempty requestToken.");
  validateWorkLimit(requestToken.length, "Inference request token length");
  if (!isGraphInferenceExecutor(executor)) throw new TypeError("Inference executor must be created by createGraphInferenceExecutor.");
  const request = Object.assign(Object.create(null), ownRecord(input, "Inference preparation request"));
  const { kind, ...args } = request;
  if (!["create", "edit"].includes(kind)) throw new TypeError("Inference preparation kind must be create or edit.");
  validateResourceGraph(program);
  const resolved = normalizeInferenceRequest(program, args, kind === "edit"), job = inferredGraphJob(resolved);
  const completion = await executor.compute(job, { signal }); active(signal);
  const resource = completedInferredGraphResource(resolved, job, completion);
  const handle = cloneAndFreeze({ kind: "graph-inference-preparation", request: { kind, id: resource.id }, inputHash: job.inputHash });
  prepared.set(handle, { base: program, kind, resource, requestToken, signal });
  return handle;
}

export function readPreparedInferredGraph(program, handle, requestToken, kind) {
  const result = prepared.get(handle);
  if (result === undefined) throw new TypeError("Expected an authentic prepared inferred graph.");
  if (result.base !== actionSource(program) || result.requestToken !== requestToken || result.kind !== kind) throw annotateError(new Error("Prepared inferred graph belongs to a different receiver, token or action."), { code: "stale-result" });
  active(result.signal); return result.resource;
}
