import { validateRouteResultStages } from "../grammar/graph/routes/result.js";
import { drainRouteStages } from "./routeStages.js";

export function runBoundedRouteWorker(createWorker, job, lifetime, scope) {
  return new Promise((resolve, reject) => {
    let worker, validation, done = false, validating = false;
    const signal = lifetime.signal;
    function finish(error, result) {
      if (done) return;
      done = true;
      EventTarget.prototype.removeEventListener.call(signal, "abort", onAbort);
      let cleanupError;
      for (const cleanup of [() => validation?.return(), () => worker?.removeEventListener?.("message", onMessage),
        () => worker?.removeEventListener?.("error", onError), () => worker?.terminate?.()]) {
        try { cleanup(); } catch (failure) { cleanupError ??= failure; }
      }
      worker = undefined; validation = undefined;
      if (error !== undefined || cleanupError !== undefined) reject(error ?? cleanupError); else resolve(result);
    }
    function onAbort() { try { lifetime.check(); } catch (error) { finish(error); } }
    function onError(event) {
      try { const error = event.error; finish(error instanceof Error ? error : new Error("Route worker failed.")); }
      catch (error) { finish(error); }
    }
    function onMessage(event) {
      if (done || validating) return;
      try {
        lifetime.check(); validating = true;
        const iterator = validateRouteResultStages(job, event.data, scope); validation = iterator;
        event = undefined;
        // Drain advances to the deep-owned snapshot before the first await.
        drainRouteStages(iterator, signal, lifetime.check).then(result => finish(undefined, result), error => finish(error));
      } catch (error) { finish(error); }
    }
    try {
      lifetime.check(); worker = createWorker();
      if (signal.aborted) { onAbort(); return; }
      if (worker === null || typeof worker !== "object" || ["postMessage", "terminate", "addEventListener", "removeEventListener"].some(key => typeof worker[key] !== "function")) throw new TypeError("Route worker requires message events, postMessage and terminate.");
      worker.addEventListener("message", onMessage); worker.addEventListener("error", onError);
      EventTarget.prototype.addEventListener.call(signal, "abort", onAbort, { once: true });
      lifetime.check(); worker.postMessage({ job }); lifetime.check();
    } catch (error) { finish(error); }
  });
}
