import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties } from "../core/validation.js";
import { annotateError } from "../core/diagnostics.js";
import { validateRouteJob, computeRouteJob } from "../grammar/graph/routes/job.js";
import { validateRouteResult } from "../grammar/graph/routes/result.js";

const executors = new WeakSet();
const MAX_PENDING = 8, MAX_ENTRIES = 8, MAX_CACHED_SAMPLES = 1_000_000;
const inactive = () => annotateError(new Error("Graph route executor is disposed."), { code: "stale-result" });
const assertActive = signal => { if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal); };
export const isGraphRouteExecutor = value => executors.has(value);

// Each host owns its worker instances and bounded completion cache. No renderer
// or ChartProgram stores host objects, listeners, promises or mutable buffers.
export function createGraphRouteExecutor(options = {}) {
  options = Object.assign(Object.create(null), ownRecord(options, "Graph route executor options"));
  rejectUnknownProperties(options, ["createWorker"], "graph route executor");
  if (Object.hasOwn(options, "createWorker") && typeof options.createWorker !== "function") throw new TypeError("Route createWorker must be a function.");
  const createWorker = options.createWorker;
  const cache = new Map(), pending = new Set();
  let disposed = false, cachedSamples = 0;
  function evict(inputHash) {
    if (inputHash === undefined) { cache.clear(); cachedSamples = 0; return; }
    if (typeof inputHash !== "string" || !/^[a-f0-9]{64}$/.test(inputHash)) throw new TypeError("Route cache eviction requires an input hash.");
    const previous = cache.get(inputHash);
    if (previous !== undefined) { cachedSamples -= previous.samples; cache.delete(inputHash); }
  }
  function retain(job, result) {
    const samples = result.result.routes.reduce((sum, route) => sum + route.commands.length + route.controlPoints.length, 0);
    if (samples > MAX_CACHED_SAMPLES || disposed) return result;
    evict(job.inputHash);
    while (cache.size >= MAX_ENTRIES || cachedSamples + samples > MAX_CACHED_SAMPLES) evict(cache.keys().next().value);
    cache.set(job.inputHash, { result, samples }); cachedSamples += samples;
    return result;
  }
  async function compute(input, args = {}) {
    if (disposed) throw inactive();
    args = Object.assign(Object.create(null), ownRecord(args, "Route computation options"));
    rejectUnknownProperties(args, ["signal"], "route computation");
    const signal = args.signal; assertActive(signal);
    const job = validateRouteJob(input), cached = cache.get(job.inputHash);
    if (cached !== undefined) {
      cache.delete(job.inputHash); cache.set(job.inputHash, cached);
      return cached.result;
    }
    if (createWorker === undefined) return retain(job, validateRouteResult(job, computeRouteJob(job, signal)));
    if (pending.size >= MAX_PENDING) throw annotateError(new RangeError("Route executor has too many pending workers."), { code: "resource-limit" });
    return new Promise((resolve, reject) => {
      let worker, done = false;
      const task = { cancel: reason => finish(reason) };
      function finish(error, result) {
        if (done) return;
        done = true; pending.delete(task);
        if (signal !== undefined) EventTarget.prototype.removeEventListener.call(signal, "abort", onAbort);
        let cleanupError;
        for (const cleanup of [() => worker?.removeEventListener?.("message", onMessage),
          () => worker?.removeEventListener?.("error", onError), () => worker?.terminate?.()]) {
          try { cleanup(); } catch (failure) { cleanupError ??= failure; }
        }
        worker = undefined;
        if (error !== undefined || cleanupError !== undefined) reject(error ?? cleanupError);
        else resolve(retain(job, result));
      }
      function onAbort() {
        try { assertActive(signal); } catch (error) { finish(error); }
      }
      function onError(event) { finish(event.error instanceof Error ? event.error : new Error("Route worker failed.")); }
      function onMessage(event) {
        if (done) return;
        try { assertActive(signal); finish(undefined, validateRouteResult(job, event.data)); }
        catch (error) { finish(error); }
      }
      pending.add(task);
      try {
        worker = createWorker();
        if (done) { worker?.terminate?.(); worker = undefined; return; }
        if (worker === null || typeof worker !== "object" || ["postMessage", "terminate", "addEventListener", "removeEventListener"].some(key => typeof worker[key] !== "function")) throw new TypeError("Route worker requires message events, postMessage and terminate.");
        worker.addEventListener("message", onMessage); worker.addEventListener("error", onError);
        if (signal !== undefined) EventTarget.prototype.addEventListener.call(signal, "abort", onAbort, { once: true });
        assertActive(signal);
        worker.postMessage({ job });
      } catch (error) { finish(error); }
    });
  }
  function dispose() {
    if (disposed) return;
    disposed = true; evict();
    for (const task of [...pending]) task.cancel(inactive());
  }
  const executor = Object.freeze({ compute, evict, dispose });
  executors.add(executor);
  return executor;
}
