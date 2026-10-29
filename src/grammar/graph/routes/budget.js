import { ownRecord } from "../../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../../core/validation.js";

export const ROUTE_LIMITS = Object.freeze({
  maxNodes: 100_000, maxEdges: 1_000_000, maxCandidatePairs: 10_000_000, maxSamples: 10_000_000
});

export function normalizeRouteLimits(input = {}) {
  ownRecord(input, "Route limits");
  rejectUnknownProperties(input, Object.keys(ROUTE_LIMITS), "route limits");
  const limits = { ...ROUTE_LIMITS, ...input };
  for (const [key, maximum] of Object.entries(ROUTE_LIMITS)) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1) throw new RangeError(`Route ${key} requires a positive safe integer.`);
    validateGeneratedItemLimit(limits[key], `Route ${key}`, maximum);
  }
  return Object.freeze(limits);
}

// Native signal state is read at bounded stage boundaries; no callback or host
// object becomes part of a route result. Workers use the same synchronous owner.
export function createRouteBudget(limits = {}, signal) {
  const resolved = normalizeRouteLimits(limits);
  let work = 0, candidatePairs = 0, peakSamples = 0;
  function check() {
    if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal);
  }
  function count(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("Route work counts require nonnegative safe integers.");
  }
  function charge(value) {
    check(); count(value);
    validateWorkLimit(work + value, "Route work");
    work += value;
  }
  check();
  return Object.freeze({
    limits: resolved, check, charge,
    pairs(value) {
      count(value);
      validateGeneratedItemLimit(candidatePairs + value, "Route candidate pairs", resolved.maxCandidatePairs);
      charge(value); candidatePairs += value;
    },
    samples(value) {
      check(); count(value);
      validateGeneratedItemLimit(value, "Route active samples", resolved.maxSamples);
      peakSamples = Math.max(peakSamples, value);
    },
    diagnostics() { return Object.freeze({ work, candidatePairs, peakSamples }); }
  });
}
