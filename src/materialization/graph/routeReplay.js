import { annotateError } from "../../core/diagnostics.js";

// Ordered worker completions of one exact prepared native invocation. Only the
// route preparation owner opens a replay, for the duration of that synchronous
// invocation; persisted state or trace can never supply one.
let active;

export function enterRouteReplay(replay) {
  const previous = active;
  active = replay;
  return () => { active = previous; };
}

export function activeRouteReplay() { return active; }

// A synchronous native step computes its exact original job first. Its input
// hash must equal the next completion in order; a repeated full pass (a
// preflight followed by the actual application) starts again at the first.
// A recording replay reports an uncovered job instead of failing, so the
// preparation owner can compute it on a worker and run the step again.
// Any request or mismatch interrupts the replay for good: a native step that
// absorbs one in its own catch cannot complete the invocation.
export function createRouteReplay(completions, scope, record = false) {
  let position = 0, passes = 0, request, interrupted = false;
  const fail = error => { interrupted = true; throw error; };
  return Object.freeze({
    scope,
    take(job) {
      if (position === completions.length && position > 0 && completions[0].inputHash === job.inputHash) position = 0;
      const expected = completions[position];
      if (expected === undefined) {
        if (record) fail(request = new RouteJobRequest(job));
        fail(annotateError(new Error("Prepared route completions do not cover this native step."), { code: "stale-result" }));
      }
      if (expected.inputHash !== job.inputHash) fail(annotateError(new Error("Prepared route completion differs from this native step."), { code: "stale-result" }));
      if (++position === completions.length) passes++;
      return expected.completion;
    },
    requested: error => error === request && error !== undefined,
    finished: () => !interrupted && passes > 0 && position === completions.length
  });
}

class RouteJobRequest extends Error {
  constructor(job) {
    super("A prepared native step requires another route computation.");
    this.job = job;
  }
}
