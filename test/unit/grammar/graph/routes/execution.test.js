import test from "node:test";
import assert from "node:assert/strict";
import { cloneAndFreeze } from "../../../../../src/core/immutable.js";
import { routeValueHash } from "../../../../../src/grammar/graph/routes/job.js";
import { normalizeRouteIntent } from "../../../../../src/grammar/graph/routes/options.js";
import { ROUTE_EXECUTION_MAXIMA, normalizeRouteExecution, normalizeRouteNodeLimits, createRouteLedger } from "../../../../../src/grammar/graph/routes/execution.js";
import { routeHashStages, finishRouteStages, ROUTE_JOB_HASH_BYTES, ROUTE_COMPLETION_BYTES } from "../../../../../src/grammar/graph/routes/valueHash.js";
import { canonicalJSON } from "../../../../../src/core/contentDigest.js";
import { encodeValue } from "../../../../../src/core/valueEncoding.js";
const policy = (patch = {}) => ({ policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA, ...patch });
const bytes = value => new TextEncoder().encode(canonicalJSON(encodeValue(value))).length;

test("bounded execution has five explicit maxima and a single limits authority", () => {
  assert.deepEqual(normalizeRouteExecution(policy()), policy());
  assert.ok(Object.isFrozen(normalizeRouteExecution(policy())));
  for (const key of Object.keys(ROUTE_EXECUTION_MAXIMA)) {
    const missing = policy(); delete missing[key];
    for (const value of [missing, policy({ [key]: undefined }), policy({ [key]: null }), policy({ [key]: 0 }), policy({ [key]: -1 }), policy({ [key]: 1.5 }), policy({ [key]: Infinity }), policy({ [key]: ROUTE_EXECUTION_MAXIMA[key] + 1 })]) assert.throws(() => normalizeRouteExecution(value), RangeError);
  }
  for (const value of [null, [], {}, { ...policy(), policy: "other" }, { ...policy(), extra: 1 }]) assert.throws(() => normalizeRouteExecution(value));
  let reads = 0; const accessor = policy(); Object.defineProperty(accessor, "maxBytes", { enumerable: true, get() { reads++; return 1; } });
  assert.throws(() => normalizeRouteExecution(accessor), /accessor/); assert.equal(reads, 0);
  assert.deepEqual(normalizeRouteNodeLimits(), { maxNodes: 100000, maxEdges: 1000000 });
  assert.deepEqual(normalizeRouteNodeLimits({ maxEdges: 3 }), { maxNodes: 100000, maxEdges: 3 });
  for (const limits of [{ maxSamples: 4 }, { maxCandidatePairs: 4 }, { maxNodes: undefined }, { maxEdges: 1000001 }, { maxNodes: -1 }, { maxEdges: 0 }]) assert.throws(() => normalizeRouteNodeLimits(limits));
  const intent = normalizeRouteIntent("edge-path", { execution: policy() });
  assert.deepEqual(intent.options.limits, { maxNodes: 100000, maxEdges: 1000000 });
  assert.throws(() => normalizeRouteIntent("density", { execution: policy(), limits: { maxSamples: 5 } }), /Unknown/);
});

test("one ledger accumulates work and pairs while buffer cleanup remains valid after abort", () => {
  const c = new AbortController(), ledger = createRouteLedger(policy({ maxWork: 5, maxCandidatePairs: 3, maxSamples: 7, maxBufferBytes: 8 }), c.signal);
  ledger.charge(2); ledger.charge(3); ledger.pairs(1); ledger.pairs(2); ledger.samples(6); ledger.samples(3);
  ledger.reserve(3); ledger.reserve(4); assert.equal(ledger.buffers(), 7); ledger.release(4);
  assert.deepEqual(ledger.diagnostics(), { work: 5, candidatePairs: 3, peakSamples: 6, peakBufferBytes: 7 });
  for (const call of [() => ledger.charge(1), () => ledger.charge(-1), () => ledger.charge(NaN), () => ledger.pairs(1), () => ledger.samples(8), () => ledger.reserve(6), () => ledger.release(4), () => ledger.release(-1)]) assert.throws(call, RangeError);
  const reason = Error("stop"); c.abort(reason);
  assert.throws(ledger.check, error => error === reason); assert.throws(() => ledger.charge(0), error => error === reason);
  ledger.release(3); assert.equal(ledger.buffers(), 0);
  assert.throws(() => createRouteLedger(policy(), c.signal), error => error === reason);
  const plain = createRouteLedger(policy()); plain.check(); plain.charge(0); plain.pairs(0); plain.samples(0); plain.reserve(0); plain.release(0);
});

test("strict route hashing preserves tagged bytes and counts complete packet headers", () => {
  const sparse = [, undefined, -0, 45n, "\ud800😀\n"], value = cloneAndFreeze({ sparse, z: null });
  const execution = policy({ maxBytes: bytes(value) });
  const ledger = createRouteLedger(execution);
  assert.deepEqual(finishRouteStages(routeHashStages(value, execution, ledger)), { hash: routeValueHash(value), bytes: bytes(value) });
  assert.equal(ledger.buffers(), 0);
  const body = cloneAndFreeze({ schemaVersion: 2, value }), hash = routeValueHash(body);
  assert.equal(bytes({ ...body, inputHash: hash }), bytes(body) + ROUTE_JOB_HASH_BYTES);
  assert.equal(bytes({ schemaVersion: 2, inputHash: hash, resultHash: hash, result: value }), bytes(value) + ROUTE_COMPLETION_BYTES);
  for (const cap of [1, bytes(value) - 1]) {
    const limits = policy({ maxBytes: cap }), state = createRouteLedger(limits);
    assert.throws(() => finishRouteStages(routeHashStages(value, limits, state)), /bytes|Bytes/); assert.equal(state.buffers(), 0);
  }
  const state = createRouteLedger(policy());
  assert.throws(() => finishRouteStages(routeHashStages(value, policy({ maxBytes: 1 }), state, 1)), /packet/);
  assert.throws(() => finishRouteStages(routeHashStages(value, policy(), createRouteLedger(policy({ maxBufferBytes: 1 })))), /buffers/);
  assert.throws(() => finishRouteStages(routeHashStages({}, policy(), state)), /deep-owned/); assert.equal(state.buffers(), 0);
  const iterator = routeHashStages(value, policy(), state); assert.equal(iterator.next().done, false); iterator.return(); assert.equal(state.buffers(), 0);
  const c = new AbortController(), aborted = createRouteLedger(policy(), c.signal), partial = routeHashStages(value, policy(), aborted);
  partial.next(); c.abort(); assert.throws(() => partial.next(), { name: "AbortError" }); assert.equal(aborted.buffers(), 0);
});
