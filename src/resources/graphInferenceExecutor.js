import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties } from "../core/validation.js";
import { annotateError } from "../core/diagnostics.js";
import { validateInferenceJob, validateInferenceCompletion } from "../grammar/graph/inferenceJob.js";

const executors = new WeakSet();
const active = signal => { if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal); };
const disposedError = () => annotateError(new Error("Graph inference executor is disposed."), { code: "stale-result" });
export const isGraphInferenceExecutor = value => executors.has(value);

// One caller-owned worker per request, one pending request, no result cache.
export function createGraphInferenceExecutor(options) {
  options = Object.assign(Object.create(null), ownRecord(options, "Inference executor options"));
  rejectUnknownProperties(options, ["createWorker"], "inference executor");
  if (typeof options.createWorker !== "function") throw new TypeError("Inference createWorker must be a function.");
  const createWorker = options.createWorker;
  let disposed = false, pending;
  async function compute(input, args = {}) {
    args = Object.assign(Object.create(null), ownRecord(args, "Inference computation options"));
    rejectUnknownProperties(args, ["signal"], "inference computation");
    const signal = args.signal; active(signal);
    if (disposed) throw disposedError();
    if (pending !== undefined) throw annotateError(new RangeError("Inference executor already has a pending worker."), { code: "resource-limit" });
    const job = validateInferenceJob(input);
    return new Promise((resolve, reject) => {
      let worker, done = false;
      function finish(error, result) {
        if (done) return;
        done = true; pending = undefined;
        if (signal !== undefined) EventTarget.prototype.removeEventListener.call(signal, "abort", onAbort);
        let cleanupError;
        for (const cleanup of [() => worker?.removeEventListener?.("message", onMessage),
          () => worker?.removeEventListener?.("error", onError), () => worker?.terminate?.()]) {
          try { cleanup(); } catch (failure) { cleanupError ??= failure; }
        }
        worker = undefined;
        if (error !== undefined || cleanupError !== undefined) reject(error ?? cleanupError);
        else resolve(result);
      }
      function onAbort() { try { active(signal); } catch (error) { finish(error); } }
      function onError(event) { if (!done) finish(event.error instanceof Error ? event.error : new Error("Inference worker failed.")); }
      function onMessage(event) {
        if (done) return;
        try { active(signal); finish(undefined, validateInferenceCompletion(job, event.data)); }
        catch (error) { finish(error); }
      }
      pending = () => finish(disposedError());
      try {
        worker = createWorker();
        if (done) { worker?.terminate?.(); worker = undefined; return; }
        if (worker === null || typeof worker !== "object" || ["postMessage", "terminate", "addEventListener", "removeEventListener"].some(key => typeof worker[key] !== "function")) throw new TypeError("Inference worker requires message events, postMessage and terminate.");
        worker.addEventListener("message", onMessage); worker.addEventListener("error", onError);
        if (signal !== undefined) EventTarget.prototype.addEventListener.call(signal, "abort", onAbort, { once: true });
        active(signal); worker.postMessage({ job });
      } catch (error) { finish(error); }
    });
  }
  function dispose() {
    if (disposed) return;
    disposed = true; pending?.();
  }
  const executor = Object.freeze({ compute, dispose });
  executors.add(executor); return executor;
}
