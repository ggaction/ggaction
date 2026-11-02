import test from "node:test";
import assert from "node:assert/strict";
import { createRouteRequestLedger, ROUTE_EXECUTION_MAXIMA } from "../../../src/grammar/graph/routes/execution.js";
import { drainNativeRouteStages } from "../../../src/resources/routeStages.js";
const policy = patch => ({ policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA, ...patch });
const resource = (id, patch) => ({ id, options: { options: { execution: policy(patch) } } });
test("one aggregate ledger checks every affected policy and keeps failed reservations atomic", () => {
  const resources = [resource("wide", {}), resource("small", { maxWork: 5, maxCandidatePairs: 3, maxSamples: 4, maxBufferBytes: 8 })];
  const ledger = createRouteRequestLedger(resources);
  ledger.charge(3); ledger.charge(2); assert.throws(() => ledger.charge(1), /small execution maxWork/);
  ledger.pairs(2); ledger.pairs(1); assert.throws(() => ledger.pairs(1), /small execution maxCandidatePairs/);
  ledger.samples(4); assert.throws(() => ledger.samples(5), /small execution maxSamples/);
  ledger.reserve(5); assert.throws(() => ledger.reserve(4), /small execution maxBufferBytes/); assert.equal(ledger.buffers(), 5); ledger.release(5);
  assert.deepEqual(ledger.diagnostics(), { work: 5, candidatePairs: 3, peakSamples: 4, peakBufferBytes: 5 });
  const fork = createRouteRequestLedger(resources, undefined, ledger.diagnostics());
  assert.deepEqual(fork.diagnostics(), ledger.diagnostics()); assert.equal(fork.buffers(), 0);
  assert.throws(() => fork.charge(1), /maxWork/);
});
test("native host drain suspends for macrotasks and always closes its owned continuation", async () => {
  let closed = 0, turns = 0;
  const lifetime = { check() {}, signal: undefined };
  const timer = setTimeout(() => turns++, 0);
  function* valid() { try { yield; const result = yield { kind: "edge-route-computation", job: "job" }; return result; } finally { closed++; } }
  assert.equal(await drainNativeRouteStages(valid(), lifetime, async job => `${job}-done`), "job-done");
  clearTimeout(timer); assert.equal(turns, 1); assert.equal(closed, 1);
  function* invalid() { try { yield { kind: "unknown" }; } finally { closed++; } }
  await assert.rejects(drainNativeRouteStages(invalid(), lifetime, () => {}), /Unknown native/); assert.equal(closed, 2);
  const failure = Error("worker failure");
  await assert.rejects(drainNativeRouteStages(valid(), lifetime, async () => { throw failure; }), error => error === failure); assert.equal(closed, 3);
});
