import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { dataInputReference } from "../selectors/resources.js";
import { validateWorkLimit, validateGeneratedItemLimit } from "../core/validation.js";
import { requireProgram } from "./hitProgram.js";
import { interactionOptions } from "./input.js";

// A complete scoped vector includes invisible resources and retained facet sources.
// It is a dependency snapshot, never a second program or an asset cache.
export function interactionResourceRevisions(program) {
  const result = [], pending = [{ program, childPath: [] }];
  let work = 0;
  const spend = amount => validateWorkLimit(work += amount, "Interaction resource revisions");
  while (pending.length) {
    const { program: view, childPath } = pending.pop();
    requireProgram(view); spend(childPath.length + 1);
    const scopeWork = childPath.reduce((size, id) => size + id.length + 1, 0);
    for (const dataset of view.semanticSpec.datasets) {
      spend(scopeWork + dataset.id.length + dataset.logicalId.length + 1);
      result.push({ childPath, ...dataInputReference(dataset) });
    }
    for (const { kind, id, revision } of view.semanticSpec.resources ?? []) {
      spend(scopeWork + kind.length + id.length + 1); result.push({ childPath, kind, id, revision });
    }
    validateGeneratedItemLimit(result.length, "Interaction resource revisions", 100_000);
    const ids = view.compositionSpec?.children ?? [];
    spend(ids.length);
    for (let index = ids.length - 1; index >= 0; index--) {
      const id = ids[index]; spend(id.length + childPath.length);
      pending.push({ program: view.children[id], childPath: [...childPath, id] });
    }
  }
  return cloneAndFreeze(result);
}

function ownLease(value) {
  let record = interactionOptions(value, ["dispose"], ["images", "fonts", "shadows"], "Interaction asset lease");
  if (typeof record.dispose !== "function") throw new TypeError("Interaction asset lease requires dispose().");
  const handles = {};
  try {
    for (const key of ["images", "fonts", "shadows"]) if (Object.hasOwn(record, key)) {
      if (record[key] === null || typeof record[key] !== "object" || !Object.isFrozen(record[key])) {
        throw new TypeError("Interaction assets require frozen prepared renderer handles.");
      }
      handles[key] = record[key];
    }
  } catch (error) { record.dispose(); throw error; }
  let disposed = false;
  return { handles: freezeOwned(handles), dispose() { if (!disposed) { disposed = true; const previous = record; record = null; previous.dispose(); } } };
}

// Host preparation is the only asynchronous boundary. The session still owns
// candidate validation, its FIFO reducer, and the single committed program.
export function createInteractionPreparation(resolver, perform, changed) {
  if (resolver !== undefined && typeof resolver !== "function") throw new TypeError("assetResolver must be a function.");
  let pending = null, accepted = null, disposed = false;
  let settled = Promise.resolve(freezeOwned({ status: "settled" }));
  const result = (status, job) => freezeOwned({ status, preparation: job.tags });
  const release = value => {
    if (!value) return;
    try { value.controller.abort(); }
    finally { const lease = value.lease; value.lease = undefined; lease?.dispose(); }
  };
  const forget = job => { job.program = job.prepare = job.current = job.error = job.cancel = undefined; };
  const cancel = reason => {
    const job = pending;
    if (!job) return false;
    pending = null;
    try { release(job); changed(); job.cancel(reason, job.tags); job.resolve(result("cancelled", job)); }
    catch (error) { job.reject(error); throw error; }
    finally { forget(job); }
    return true;
  };
  return {
    get enabled() { return resolver !== undefined; },
    inspect() { return { assets: accepted?.lease.handles ?? null, preparation: pending?.tags ?? null }; },
    whenSettled() { return settled; },
    cancel,
    start(program, tags, handlers, vector = interactionResourceRevisions(program)) {
      if (disposed) throw new Error("Interaction preparation is disposed.");
      cancel("superseded");
      const controller = new AbortController();
      const job = { ...handlers, controller, program, tags: cloneAndFreeze({ ...tags, resourceRevisionVector: vector }) };
      settled = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
      // Subscribers can observe asynchronous callback failures by awaiting the
      // returned promise; an unused promise must not create a global rejection.
      settled.catch(() => {});
      pending = job; changed();
      const current = () => !disposed && pending === job && job.current(job.tags) &&
        JSON.stringify(interactionResourceRevisions(job.program)) === JSON.stringify(job.tags.resourceRevisionVector);
      const failed = error => {
        if (pending !== job) return;
        pending = null;
        try { release(job); changed(); job.error(error, job.tags); job.resolve(result("error", job)); }
        catch (failure) { job.reject(failure); throw failure; }
        finally { forget(job); }
      };
      Promise.resolve().then(() => {
        if (disposed || pending !== job) return;
        return resolver(freezeOwned({ program: job.program, signal: controller.signal, ...job.tags }));
      }).then(value => {
        if (value === undefined && (disposed || pending !== job)) return;
        job.lease = ownLease(value);
        if (!current()) { if (pending === job) cancel("stale"); else release(job); return; }
        perform(() => {
          if (!current()) { if (pending === job) cancel("stale"); else release(job); return; }
          // All fallible native/frame validation precedes lease publication.
          let commit;
          try { commit = job.prepare(job.tags); } catch (error) { failed(error); return; }
          const previous = accepted;
          pending = null; accepted = { controller, lease: job.lease }; job.lease = undefined;
          try { try { commit(); } finally { release(previous); } job.resolve(result("settled", job)); }
          catch (error) { job.reject(error); throw error; }
          finally { forget(job); }
        });
      }).catch(error => {
        if (disposed || pending !== job) { job.reject(error); return; }
        try { perform(() => failed(error)); } catch (failure) { job.reject(failure); }
      });
      return freezeOwned({ status: "queued" });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try { cancel("destroy"); }
      finally {
        const previous = accepted; accepted = null;
        try { release(previous); } finally { resolver = perform = changed = undefined; }
      }
    }
  };
}
