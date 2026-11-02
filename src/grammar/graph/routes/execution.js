import { ownRecord } from "../../../core/ownData.js";
import { rejectUnknownProperties } from "../../../core/validation.js";

export const ROUTE_EXECUTION_MAXIMA = Object.freeze({
  maxWork: 8_000_000_000, maxCandidatePairs: 50_000_000, maxSamples: 16_777_216,
  maxBufferBytes: 134_217_728, maxBytes: 134_217_728
});

export function normalizeRouteExecution(input) {
  ownRecord(input, "Route execution");
  rejectUnknownProperties(input, ["policy", ...Object.keys(ROUTE_EXECUTION_MAXIMA)], "route execution");
  if (!Object.hasOwn(input, "policy") || input.policy !== "bounded-route@1") throw new TypeError("Route execution policy must be bounded-route@1.");
  const result = { policy: input.policy };
  for (const [key, maximum] of Object.entries(ROUTE_EXECUTION_MAXIMA)) {
    if (!Object.hasOwn(input, key) || !Number.isSafeInteger(input[key]) || input[key] < 1 || input[key] > maximum) {
      throw new RangeError(`Route execution ${key} must be a positive safe integer at most ${maximum}.`);
    }
    result[key] = input[key];
  }
  return Object.freeze(result);
}

export function normalizeRouteNodeLimits(input = {}) {
  ownRecord(input, "Route limits");
  rejectUnknownProperties(input, ["maxNodes", "maxEdges"], "route limits");
  const result = { maxNodes: 100_000, maxEdges: 1_000_000, ...input };
  for (const [key, maximum] of [["maxNodes", 100_000], ["maxEdges", 1_000_000]]) {
    if (!Number.isSafeInteger(result[key]) || result[key] < 1 || result[key] > maximum) throw new RangeError(`Route ${key} must be a positive safe integer at most ${maximum}.`);
  }
  return Object.freeze(result);
}

// One transient ledger covers a native request. It grants no job or resource
// authority; exact native validation and the existing registries do that.
export function createRouteLedger(input, signal, initial) {
  const execution = normalizeRouteExecution(input);
  let work = 0, candidatePairs = 0, peakSamples = 0, bufferBytes = 0, peakBufferBytes = 0;
  function check() { if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal); }
  function bounded(value, key, label) {
    check();
    if (!Number.isSafeInteger(value) || value < 0 || value > execution[key]) throw new RangeError(`${label} exceeds route execution ${key}.`);
  }
  check();
  const ledger = Object.freeze({ execution, check,
    charge(count) { bounded(count, "maxWork", "Route work"); bounded(work + count, "maxWork", "Route work"); work += count; },
    pairs(count) { bounded(count, "maxCandidatePairs", "Route candidate pairs"); bounded(candidatePairs + count, "maxCandidatePairs", "Route candidate pairs"); candidatePairs += count; },
    samples(count) { bounded(count, "maxSamples", "Route active samples"); peakSamples = Math.max(peakSamples, count); },
    reserve(count) { bounded(count, "maxBufferBytes", "Route buffers"); bounded(bufferBytes + count, "maxBufferBytes", "Route buffers"); bufferBytes += count; peakBufferBytes = Math.max(peakBufferBytes, bufferBytes); },
    release(count) {
      // Cleanup must work after cancellation and must never underflow a lease.
      if (!Number.isSafeInteger(count) || count < 0 || count > bufferBytes) throw new RangeError("Route buffer release exceeds its reservation.");
      bufferBytes -= count;
    },
    diagnostics() { return Object.freeze({ work, candidatePairs, peakSamples, peakBufferBytes }); },
    buffers() { return bufferBytes; }
  });
  if (initial !== undefined) {
    ledger.charge(initial.work); ledger.pairs(initial.candidatePairs); ledger.samples(initial.peakSamples);
    ledger.reserve(initial.peakBufferBytes); ledger.release(initial.peakBufferBytes);
  }
  return ledger;
}
