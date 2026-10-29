import assert from "node:assert/strict";
import test from "node:test";
import { Worker } from "node:worker_threads";
import { chart } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutes } from "../../../src/graph.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { edgeRouteJob } from "../../../src/materialization/graph/routeResource.js";
import { normalizeRouteIntent } from "../../../src/grammar/graph/routes/options.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { withPreparedScreenRouteResults, withPreparedDataResourceResults } from "../../../src/actions/primitives/preparedResourceContext.js";
import { dataInputReference } from "../../../src/selectors/resources.js";

const get = (p, kind, id) => p.semanticSpec.resources.find(r => r.kind === kind && r.id === id);
const source = () => chart().createCanvas({ width: 400, height: 300 })
  .createData({ id: "nodes", values: [{ key: "a" }, { key: "b" }, { key: "c" }] })
  .createData({ id: "edges", values: [{ s: "a", t: "c" }, { s: "a", t: "b" }, { s: "b", t: "c" }] })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "key", source: "s", target: "t", directed: true })
  .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "a", x: 0, y: 0 }, { key: "b", x: 50, y: 50 }, { key: "c", x: 100, y: 0 }] } });
const jobFor = (p, exponent = 2) => edgeRouteJob(p, get(p, "graph", "graph"), get(p, "layout", "layout"), normalizeRouteIntent("edge-path", { exponent }));
const count = (trace, op) => (trace.op === op ? 1 : 0) + trace.children.reduce((sum, child) => sum + count(child, op), 0);

function controlledWorkers() {
  const workers = [];
  return { workers, createWorker() {
    const listeners = new Map();
    const worker = { terminated: 0, job: undefined, listeners,
      postMessage({ job }) { this.job = structuredClone(job); },
      addEventListener(type, listener) { listeners.set(type, listener); },
      removeEventListener(type) { listeners.delete(type); },
      terminate() { this.terminated++; },
      complete(value = computeGraphEdgeRoutes(this.job)) { listeners.get("message")?.({ data: value }); },
      fail(error) { listeners.get("error")?.({ error }); }
    };
    workers.push(worker); return worker;
  } };
}

test("prepared routes match synchronous authoring and preserve exact receiver, token and action authority", async () => {
  const p = source(), snapshot = serializeProgram(p), request = { id: "routes", method: "edge-path" };
  const prepared = await prepareGraphEdgeRoutes(p, { kind: "create", ...request }, { requestToken: "one" });
  assert.ok(Object.isFrozen(prepared));
  const applied = p.bundleGraphEdges({ prepared, requestToken: "one" });
  assert.deepEqual(applied.semanticSpec, p.bundleGraphEdges(request).semanticSpec);
  assert.deepEqual(deserializeProgram(serializeProgram(applied)).semanticSpec, applied.semanticSpec);
  for (const run of [() => p.bundleGraphEdges({ prepared: { ...prepared }, requestToken: "one" }),
    () => p.bundleGraphEdges({ prepared, requestToken: "two" }), () => p.editEdgeRoute({ prepared, requestToken: "one" }),
    () => p.bundleGraphEdges({ prepared, requestToken: "one", method: "edge-path" }),
    () => p.bundleGraphEdges({ requestToken: "one", ...request }),
    () => p.editCanvas({ background: "white" }).bundleGraphEdges({ prepared, requestToken: "one" }),
    () => deserializeProgram(snapshot).bundleGraphEdges({ prepared, requestToken: "one" })]) assert.throws(run);
  const edit = await prepareGraphEdgeRoutes(applied, { kind: "edit", options: { exponent: 3 } }, { requestToken: "edit" });
  assert.equal(get(applied.editEdgeRoute({ prepared: edit, requestToken: "edit" }), "edge-route", "routes").revision, 1);
  assert.equal(serializeProgram(p), snapshot);
  await assert.rejects(prepareGraphEdgeRoutes(basicChart(), { kind: "create", ...request }, { requestToken: "one" }), /Full/);
});

test("route preparation snapshots host options and rejects aborted, forged and descriptor-bearing requests", async () => {
  const p = source(), workers = controlledWorkers();
  const running = createGraphRouteExecutor({ createWorker: workers.createWorker });
  const abort = new AbortController(), host = { requestToken: "original", signal: abort.signal, executor: running };
  const promise = prepareGraphEdgeRoutes(p, { kind: "create", id: "routes", method: "edge-path" }, host);
  host.requestToken = "changed"; host.signal = new AbortController().signal; host.executor = {};
  workers.workers[0].complete();
  const prepared = await promise;
  assert.doesNotThrow(() => p.bundleGraphEdges({ prepared, requestToken: "original" }));
  assert.throws(() => p.bundleGraphEdges({ prepared, requestToken: "changed" }), /token/);
  abort.abort(new Error("cancelled after preparation"));
  assert.throws(() => p.bundleGraphEdges({ prepared, requestToken: "original" }), /cancelled/);
  const badRequest = { kind: "create", get id() { throw new Error("must not execute"); } };
  const badHost = { get requestToken() { throw new Error("must not execute"); } };
  await assert.rejects(prepareGraphEdgeRoutes(p, badRequest, { requestToken: "x" }), /accessors/);
  await assert.rejects(prepareGraphEdgeRoutes(p, { kind: "create" }, badHost), /accessors/);
  await assert.rejects(prepareGraphEdgeRoutes(p, { kind: "create" }, { requestToken: "" }), /nonempty/);
  await assert.rejects(prepareGraphEdgeRoutes(p, { kind: "other" }, { requestToken: "x" }), /kind/);
  await assert.rejects(prepareGraphEdgeRoutes(p, { kind: "create" }, { requestToken: "x", executor: {} }), /created by/);
  running.dispose();
});

test("explicit route executors bound cache lifetime, pending workers, cancellation and late completions", async () => {
  const p = source(), workers = controlledWorkers(), executor = createGraphRouteExecutor({ createWorker: workers.createWorker });
  const firstJob = jobFor(p), first = executor.compute(firstJob); workers.workers[0].complete();
  const result = await first;
  assert.equal(await executor.compute(firstJob), result); assert.equal(workers.workers.length, 1);
  executor.evict(firstJob.inputHash);
  const second = executor.compute(firstJob); workers.workers[1].complete(); await second;
  assert.equal(workers.workers[1].terminated, 1); assert.equal(workers.workers[1].listeners.size, 0);
  assert.throws(() => executor.evict("wrong"), /hash/);
  executor.evict();
  const abort = new AbortController(), cancelled = executor.compute(firstJob, { signal: abort.signal });
  const late = workers.workers[2].listeners.get("message");
  abort.abort(new Error("cancelled computation"));
  await assert.rejects(cancelled, /cancelled/);
  late({ data: computeGraphEdgeRoutes(firstJob) });
  assert.equal(workers.workers[2].terminated, 1);
  const pending = Array.from({ length: 8 }, (_, i) => executor.compute(jobFor(p, i + 1)));
  await assert.rejects(executor.compute(jobFor(p, 10)), error => getErrorDetails(error)?.code === "resource-limit");
  executor.dispose(); executor.dispose();
  for (const value of pending) await assert.rejects(value, /disposed/);
  assert.ok(workers.workers.every(worker => worker.terminated === 1 && worker.listeners.size === 0));
  await assert.rejects(executor.compute(firstJob), /disposed/);
  const synchronous = createGraphRouteExecutor();
  assert.deepEqual(await synchronous.compute(firstJob), computeGraphEdgeRoutes(firstJob)); synchronous.dispose();
});

test("worker completion validation rejects stale payloads, malformed workers and transport failures", async () => {
  const p = source(), workers = controlledWorkers(), executor = createGraphRouteExecutor({ createWorker: workers.createWorker });
  const first = executor.compute(jobFor(p)); workers.workers[0].complete(computeGraphEdgeRoutes(jobFor(p, 3)));
  await assert.rejects(first, /stale/);
  const second = executor.compute(jobFor(p)); workers.workers[1].fail(new Error("worker transport"));
  await assert.rejects(second, /transport/);
  const third = executor.compute(jobFor(p)); workers.workers[2].fail("unknown");
  await assert.rejects(third, /worker failed/);
  for (const factory of [() => null, () => { throw new Error("factory failed"); }, () => ({ postMessage() {} })]) {
    const bad = createGraphRouteExecutor({ createWorker: factory });
    await assert.rejects(bad.compute(jobFor(p)), /worker|factory/); bad.dispose();
  }
  assert.throws(() => createGraphRouteExecutor({ createWorker: undefined }), /function/);
  const cleanup = createGraphRouteExecutor({ createWorker: () => ({ ...workers.createWorker(), terminate() { throw new Error("cleanup failed"); } }) });
  const failedCleanup = cleanup.compute(jobFor(p)); workers.workers.at(-1).complete(computeGraphEdgeRoutes(jobFor(p)));
  await assert.rejects(failedCleanup, /cleanup/); cleanup.dispose(); executor.dispose();
});

test("route cache eviction is least-recently-used and disposal during worker construction leaves no live worker", async () => {
  const p = source(), workers = controlledWorkers(), executor = createGraphRouteExecutor({ createWorker: workers.createWorker });
  for (let exponent = 1; exponent <= 8; exponent++) { const promise = executor.compute(jobFor(p, exponent)); workers.workers.at(-1).complete(); await promise; }
  await executor.compute(jobFor(p, 1));
  const ninth = executor.compute(jobFor(p, 9)); workers.workers.at(-1).complete(); await ninth;
  await executor.compute(jobFor(p, 1)); assert.equal(workers.workers.length, 9);
  const evicted = executor.compute(jobFor(p, 2)); assert.equal(workers.workers.length, 10); workers.workers.at(-1).complete(); await evicted;
  executor.dispose();
  let reentrant;
  reentrant = createGraphRouteExecutor({ createWorker() { reentrant.dispose(); return workers.createWorker(); } });
  await assert.rejects(reentrant.compute(jobFor(p)), /disposed/);
  assert.equal(workers.workers.at(-1).terminated, 1); assert.equal(workers.workers.at(-1).listeners.size, 0);
});

test("a real worker computes the same completed numeric routes as the synchronous boundary", async () => {
  const p = source(), request = { kind: "create", id: "routes", method: "edge-path" };
  let terminated = 0;
  const executor = createGraphRouteExecutor({ createWorker() {
    const worker = new Worker(new URL("../../support/graph-route-worker.mjs", import.meta.url)), listeners = new Map();
    return {
      postMessage(message) { worker.postMessage(message); },
      addEventListener(type, listener) { const wrapped = value => listener(type === "message" ? { data: value } : { error: value }); listeners.set(listener, wrapped); worker.on(type, wrapped); },
      removeEventListener(type, listener) { worker.off(type, listeners.get(listener)); listeners.delete(listener); },
      terminate() { terminated++; void worker.terminate(); }
    };
  } });
  const prepared = await prepareGraphEdgeRoutes(p, request, { requestToken: "worker", executor });
  const actual = p.bundleGraphEdges({ prepared, requestToken: "worker" });
  assert.deepEqual(get(actual, "edge-route", "routes"), get(p.bundleGraphEdges({ id: "routes", method: "edge-path" }), "edge-route", "routes"));
  assert.equal(terminated, 1); executor.dispose();
});

test("Canvas invalidates screen routes atomically and rematerializes each shared consumer once", () => {
  const p = source().bundleGraphEdges({ id: "screen", method: "edge-path", coordinateSpace: "screen" })
    .bundleGraphEdges({ id: "second", method: "force-directed", coordinateSpace: "screen" })
    .bundleGraphEdges({ id: "world", method: "edge-path" })
    .createGraphPlot({ id: "one", routes: "screen" }).createGraphPlot({ id: "two", routes: "screen" });
  const snapshot = serializeProgram(p);
  for (const args of [{ width: 500 }, { margin: { left: 30 } }, { plot: { width: 300, height: 200 } }]) {
    const next = p.editCanvas(args);
    assert.equal(get(next, "edge-route", "screen").revision, 1);
    assert.equal(get(next, "edge-route", "second").revision, 1);
    assert.equal(get(next, "edge-route", "world"), get(p, "edge-route", "world"));
    assert.notEqual(get(next, "edge-route", "screen").result.inputHash, get(p, "edge-route", "screen").result.inputHash);
    assert.equal(count(next.trace.children.at(-1), "refreshScreenEdgeRoutes"), 1);
    assert.equal(count(next.trace.children.at(-1), "materializeGraphPlot"), 2);
    assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  }
  assert.equal(get(p.editCanvas({ background: "red" }), "edge-route", "screen"), get(p, "edge-route", "screen"));
  assert.equal(get(p.editCanvas({ width: 400 }), "edge-route", "screen"), get(p, "edge-route", "screen"));
  assert.throws(() => p.refreshScreenEdgeRoutes({}), /exact private/);
  assert.throws(() => p.editCanvas({ width: -1 }));
  assert.equal(serializeProgram(p), snapshot);
});

test("private screen revision authority rejects incomplete unions and changes to world routes or intent", () => {
  const p = source().bundleGraphEdges({ id: "first", method: "edge-path", coordinateSpace: "screen" })
    .bundleGraphEdges({ id: "second", method: "edge-path", coordinateSpace: "screen" });
  const complete = p.editCanvas({ width: 500 }), canvasOnly = p.editGraphics({ target: "canvas", property: "width", value: 500 });
  const first = get(complete, "edge-route", "first"), second = get(complete, "edge-route", "second"), snapshot = serializeProgram(p);
  const apply = (value, replacements, receiver = canvasOnly) => withPreparedScreenRouteResults(receiver,
    { property: "resource[edge-route:first]", value }, replacements, args => receiver.editSemantic(args));
  assert.throws(() => apply(first, []), /every invalidated/);
  const replacements = [{ previous: { kind: "edge-route", id: "second", revision: 0 }, resource: second }];
  assert.throws(() => apply({ ...first, options: { ...first.options, options: { ...first.options.options, exponent: 3 } } }, replacements), /changed viewport only/);
  assert.throws(() => apply(first, [{ ...replacements[0], resource: { ...second, options: { ...second.options, coordinateSpace: "world" } } }]), /screen edge routes/);
  assert.throws(() => apply(first, [{ ...replacements[0], previous: { ...replacements[0].previous, revision: 1 } }]), /next revisions/);
  assert.throws(() => withPreparedScreenRouteResults(canvasOnly, { property: "resource[edge-route:first]", value: first }, replacements,
    args => p.editSemantic(args)), /different receiver/);
  assert.equal(serializeProgram(p), snapshot);
});

test("source result unions admit viewport-only siblings with exact unchanged route inputs and intent", () => {
  const original = source().bundleGraphEdges({ id: "first", method: "edge-path", coordinateSpace: "screen" })
    .bundleGraphEdges({ id: "second", method: "edge-path", coordinateSpace: "screen" });
  const rows = original.semanticSpec.datasets.find(data => data.id === "nodes").values;
  const p = original.reviseData({ source: "nodes", id: "updated", values: rows });
  const complete = p.editCanvas({ width: 500 }), canvasOnly = p.editGraphics({ target: "canvas", property: "width", value: 500 });
  const first = get(complete, "edge-route", "first"), second = get(complete, "edge-route", "second");
  const refs = [{ previous: dataInputReference(p.semanticSpec.datasets.find(data => data.id === "nodes")),
    next: dataInputReference(p.semanticSpec.datasets.find(data => data.id === "updated")) }];
  const replacements = [{ previous: { kind: "edge-route", id: "second", revision: 1 }, resource: second }];
  const apply = (value = first, siblings = replacements, data = refs) => withPreparedDataResourceResults(canvasOnly,
    { property: "resource[edge-route:first]", value }, siblings, args => canvasOnly.editSemantic(args), data);
  const next = apply();
  assert.deepEqual(get(next, "edge-route", "second"), second);
  assert.throws(() => apply(first, [], refs), /every affected/);
  assert.throws(() => apply(first, replacements, []), /rooted|does not belong/);
  const changedIntent = resource => ({ ...resource, options: { ...resource.options,
    options: { ...resource.options.options, exponent: 3 } } });
  assert.throws(() => apply(changedIntent(first)), /preserve.*intent and inputs/);
  assert.throws(() => apply(first, [{ ...replacements[0], resource: changedIntent(second) }]), /preserve.*intent and inputs/);
  assert.deepEqual(get(p, "edge-route", "first").result.viewport, get(original, "edge-route", "first").result.viewport);
});
