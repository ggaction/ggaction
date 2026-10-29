import assert from "node:assert/strict";
import test from "node:test";
import { Worker } from "node:worker_threads";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { createGraphRouteExecutor, prepareGraphEdgeRoutes, computeGraphEdgeRoutes } from "../../src/graph.js";

const base = () => chart().createCanvas({ width: 200, height: 160 }).createParameter({ id: "n", value: 0 });
const edit = value => ({ type: "setParameter", target: "n", payload: { value } });
const tick = () => new Promise(resolve => setImmediate(resolve));
function pending(session, options) {
  let call;
  const result = session.updateProgram(request => new Promise((resolve, reject) => { call = { request, resolve, reject }; }), options);
  return { result, settled: session.whenSettled(), get call() { return call; } };
}

test("prepared updates preserve exact base tags and commit the native result once after completion", async () => {
  const p = base(), snapshot = serializeProgram(p), s = createInteractionSession({ program: p, bindings: [] }), events = [];
  s.subscribe(e => events.push(e));
  const run = pending(s, { history: "record", transactionId: "layout", origin: "linked", causeTransactionId: "input" });
  assert.deepEqual(run.result, { status: "queued" }); await tick();
  assert.equal(run.call.request.program, p); assert.equal(s.getState().program, p);
  assert.deepEqual(run.call.request.resourceRevisionVector, [{ childPath: [], kind: "parameter", id: "n", revision: 0 }]);
  assert.equal(run.call.request.baseRevision, 0); assert.equal(run.call.request.sessionGeneration, 0);
  assert.equal(run.call.request.transactionId, "layout"); assert.ok(Object.isFrozen(run.call.request));
  const next = p.editParameter({ target: "n", value: 4 }); run.call.resolve(next);
  assert.equal((await run.settled).status, "settled"); assert.equal(s.getState().program, next);
  assert.equal(s.getState().revision, 1); assert.equal(s.getState().history.undoCount, 1);
  assert.deepEqual(events.map(e => [e.type, e.status]), [["program", undefined], ["update", "settled"]]);
  assert.equal(events[1].origin, "linked"); assert.equal(events[1].causeTransactionId, "input");
  s.dispatch({ type: "undo" }); assert.equal(s.getState().program, p); assert.equal(serializeProgram(p), snapshot);
  s.destroy(); assert.equal(run.call.request.signal.aborted, true);
});

test("newer updates and native commits abort older work before late success can overwrite state", async () => {
  const p = base(), s = createInteractionSession({ program: p, bindings: [] }), events = [];
  s.subscribe(e => events.push(e));
  const first = pending(s, { transactionId: "first" }); await tick();
  const second = pending(s, { transactionId: "second" }); await tick();
  assert.equal((await first.settled).status, "cancelled"); assert.equal(first.call.request.signal.aborted, true);
  second.call.resolve(p.editParameter({ target: "n", value: 2 })); await second.settled;
  const accepted = s.getState(); first.call.resolve(p.editParameter({ target: "n", value: 1 })); await tick();
  assert.equal(s.getState(), accepted);
  const third = pending(s); await tick(); s.dispatch(edit(3)); const native = s.getState();
  assert.equal((await third.settled).status, "cancelled"); third.call.resolve(p); await tick();
  assert.equal(s.getState(), native);
  assert.deepEqual(events.filter(e => e.type === "update").map(e => e.status), ["cancelled", "settled", "cancelled"]);
  s.destroy();
});

test("invalid native commands preserve pending work, while valid external and no-op restores supersede it", async () => {
  const p = base(), s = createInteractionSession({ program: p, bindings: [] });
  const run = pending(s); await tick();
  assert.throws(() => s.dispatch(edit(NaN)), /finite/); assert.throws(() => s.updateProgram(null));
  assert.equal(run.call.request.signal.aborted, false);
  s.updateProgram(p.editCanvas({ width: 300 })); assert.equal((await run.settled).status, "cancelled");
  run.call.resolve(p); await tick(); assert.notEqual(s.getState().program, p);
  for (const command of [{ type: "redo" }, edit(0)]) {
    const next = pending(s); await tick(); s.dispatch(command);
    assert.equal((await next.settled).status, "cancelled"); next.call.resolve(p); await tick();
  }
  s.destroy();
});

test("invalid or rejected prepared programs report one terminal error and preserve program, trace and history", async () => {
  const p = base(), s = createInteractionSession({ program: p, bindings: [] }), events = [];
  s.subscribe(e => events.push(e));
  for (const value of [undefined, null, {}, false]) {
    s.updateProgram(() => value); assert.equal((await s.whenSettled()).status, "error");
    assert.equal(s.getState().program, p); assert.equal(s.getState().history.undoCount, 0); assert.equal(s.getState().revision, 0);
  }
  s.updateProgram(() => { throw new Error("transport"); }); assert.equal((await s.whenSettled()).status, "error");
  assert.deepEqual(events.map(e => [e.type, e.status]), Array.from({ length: 5 }, () => ["update", "error"]));
  let invoked = 0;
  for (const options of [{ history: "bad" }, { origin: "bad" }, { transactionId: "" }, { causeTransactionId: "" }, { extra: true }]) assert.throws(() => s.updateProgram(() => { invoked++; return p; }, options));
  assert.equal(invoked, 0); s.destroy();
});

test("native result and renderer assets form one atomic history boundary with distinct exact vectors", async () => {
  const p = base(), assets = [], releases = [], events = [];
  const s = createInteractionSession({ program: p, bindings: [], assetResolver(request) { return new Promise((resolve, reject) => assets.push({ request, resolve, reject })); } });
  s.subscribe(e => events.push(e)); await tick(); assets[0].resolve({ dispose() { releases.push("initial"); } }); await s.whenSettled();
  const firstAssets = s.getState().assets, run = pending(s, { history: "record", transactionId: "pipeline" }); await tick();
  assert.equal(run.call.request.resourceRevisionVector[0].revision, 0);
  const next = p.editParameter({ target: "n", value: 5 }); run.call.resolve(next); await tick();
  assert.equal(assets[1].request.program, next); assert.equal(assets[1].request.resourceRevisionVector[0].revision, 1);
  assert.equal(s.getState().preparation.resourceRevisionVector[0].revision, 0);
  assert.equal(s.getState().program, p); assert.equal(s.getState().assets, firstAssets); assert.equal(s.getState().history.undoCount, 0);
  assets[1].resolve({ dispose() { releases.push("next"); } }); await run.settled;
  assert.equal(s.getState().program, next); assert.equal(s.getState().history.undoCount, 1);
  assert.deepEqual(events.slice(-2).map(e => [e.type, e.status]), [["program", undefined], ["update", "settled"]]);
  const failing = pending(s); await tick(); failing.call.resolve(p); await tick(); assets[2].reject(new Error("decode failed"));
  assert.equal((await failing.settled).status, "error"); assert.equal(s.getState().program, next); assert.equal(s.getState().history.undoCount, 1);
  s.destroy(); assert.deepEqual(releases, ["initial", "next"]);
});

test("asset completion after a superseding prepared update releases the stale lease without publication", async () => {
  const p = base(), calls = [], released = [], s = createInteractionSession({ program: p, bindings: [], assetResolver() { return new Promise(resolve => calls.push(resolve)); } });
  await tick(); calls[0]({ dispose() {} }); await s.whenSettled();
  s.updateProgram(({ program }) => program.editParameter({ target: "n", value: 1 })); const stale = s.whenSettled(); await tick();
  const newer = pending(s); await tick(); assert.equal((await stale).status, "cancelled");
  calls[1]({ dispose() { released.push("stale"); } }); await tick(); assert.deepEqual(released, ["stale"]);
  newer.call.resolve(p); await tick(); calls[2]({ dispose() {} }); await newer.settled; assert.equal(s.getState().program, p); s.destroy();
});

test("settled callback reentry keeps FIFO ordering and blocks the same explicit transaction", async () => {
  const p = base(), s = createInteractionSession({ program: p, bindings: [] }), seen = [];
  s.subscribe(e => {
    if (e.type !== "update") return;
    seen.push(e.transactionId);
    if (e.transactionId === "first") {
      s.updateProgram(() => { throw new Error("loop ran"); }, { transactionId: "first" });
      s.updateProgram(({ program }) => program.editParameter({ target: "n", value: 2 }), { transactionId: "second" });
    }
  });
  s.updateProgram(({ program }) => program.editParameter({ target: "n", value: 1 }), { transactionId: "first" }); await s.whenSettled(); await tick(); await s.whenSettled();
  assert.deepEqual(seen, ["first", "second"]); assert.equal(s.getState().program.semanticSpec.resources[0].result.value, 2); s.destroy();
});

test("100 cancelled native computations cannot publish after idempotent destruction", async () => {
  let settlements = 0;
  for (let i = 0; i < 100; i++) {
    const p = base(), s = createInteractionSession({ program: p, bindings: [] });
    s.subscribe(e => { if (e.type === "update" && e.status === "settled") settlements++; });
    const run = pending(s); await tick(); assert.equal(s.destroy(), true); assert.equal(s.destroy(), false);
    assert.equal((await run.settled).status, "cancelled"); assert.equal(run.call.request.signal.aborted, true);
    run.call.resolve(p); await tick(); assert.equal(s.getState().program, p); assert.equal(s.getState().destroyed, true);
  }
  assert.equal(settlements, 0);
});

const graph = () => chart().createCanvas({ width: 400, height: 300 })
  .createData({ id: "nodes", values: [{ key: "a" }, { key: "b" }, { key: "c" }] })
  .createData({ id: "edges", values: [{ s: "a", t: "c" }, { s: "a", t: "b" }, { s: "b", t: "c" }] })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "key", source: "s", target: "t", directed: true })
  .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "a", x: 0, y: 0 }, { key: "b", x: 50, y: 50 }, { key: "c", x: 100, y: 0 }] } });
function routeUpdate(executor) {
  return async ({ program, signal, transactionId }) => {
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "create", id: "routes", method: "edge-path" }, { executor, signal, requestToken: transactionId });
    return program.bundleGraphEdges({ prepared, requestToken: transactionId }).createGraphPlot({ id: "plot", routes: "routes" });
  };
}

test("real native route workers produce the same immutable resource, scene and restored state", async () => {
  let terminated = 0, listeners = 0;
  const executor = createGraphRouteExecutor({ createWorker() {
    const worker = new Worker(new URL("../support/graph-route-worker.mjs", import.meta.url)), callbacks = new Map();
    return { postMessage(value) { worker.postMessage(value); },
      addEventListener(type, callback) { const fn = value => callback(type === "message" ? { data: value } : { error: value }); callbacks.set(callback, fn); worker.on(type, fn); listeners++; },
      removeEventListener(type, callback) { worker.off(type, callbacks.get(callback)); callbacks.delete(callback); listeners--; },
      terminate() { terminated++; void worker.terminate(); } };
  } });
  const p = graph(), s = createInteractionSession({ program: p, bindings: [] }), snapshot = serializeProgram(p);
  s.updateProgram(routeUpdate(executor), { history: "record" }); assert.equal(s.getState().program, p);
  assert.equal((await s.whenSettled()).status, "settled");
  const expected = p.bundleGraphEdges({ id: "routes", method: "edge-path" }).createGraphPlot({ id: "plot", routes: "routes" });
  assert.deepEqual(s.getState().program.semanticSpec, expected.semanticSpec); assert.deepEqual(s.getState().program.graphicSpec, expected.graphicSpec);
  assert.deepEqual(deserializeProgram(serializeProgram(s.getState().program)).graphicSpec, expected.graphicSpec);
  assert.equal(listeners, 0); assert.equal(terminated, 1); assert.equal(serializeProgram(p), snapshot); s.destroy(); executor.dispose();
});

test("native route workers abort on replacement and destroy, remove transport listeners and reject late envelopes", async () => {
  const workers = [], executor = createGraphRouteExecutor({ createWorker() {
    const listeners = new Map();
    const worker = { job: null, terminated: 0, late: null, listeners,
      postMessage({ job }) { this.job = structuredClone(job); this.late = listeners.get("message"); },
      addEventListener(type, listener) { listeners.set(type, listener); }, removeEventListener(type) { listeners.delete(type); }, terminate() { this.terminated++; } };
    workers.push(worker); return worker;
  } });
  const p = graph(), s = createInteractionSession({ program: p, bindings: [] });
  for (let index = 0; index < 100; index++) {
    const destroy = index === 99;
    s.updateProgram(routeUpdate(executor)); const ready = s.whenSettled(); await tick(); const worker = workers.at(-1);
    if (destroy) s.destroy(); else s.updateProgram(p.editCanvas({ width: 500 }));
    assert.equal((await ready).status, "cancelled"); await tick(); assert.equal(worker.terminated, 1); assert.equal(worker.listeners.size, 0);
    const before = s.getState(); worker.late({ data: computeGraphEdgeRoutes(worker.job) }); await tick(); assert.equal(s.getState(), before);
  }
  executor.dispose();
});

test("Basic and nested callbacks preserve native capability and scoped dataset identities", async () => {
  const b = basic().createCanvas({ width: 100, height: 100, margin: 0 }), s = createInteractionSession({ program: b, bindings: [] });
  s.updateProgram(({ program }) => program.editGraphics({ target: "canvas", property: "width", value: 120 })); assert.equal((await s.whenSettled()).status, "settled");
  assert.equal(typeof s.getState().program.bundleGraphEdges, "undefined"); s.destroy();
  const left = base().createData({ id: "rows", values: [{ v: 1 }] }), right = left.editParameter({ target: "n", value: 1 });
  const p = hconcat({ programs: [{ id: "left", program: left }, { id: "right", program: right }] }), nested = createInteractionSession({ program: p, bindings: [] });
  const run = pending(nested); await tick();
  assert.deepEqual(run.call.request.resourceRevisionVector.filter(r => r.kind === "parameter").map(r => [r.childPath, r.revision]), [[["left"], 0], [["right"], 1]]);
  assert.equal(run.call.request.resourceRevisionVector.find(r => r.kind === "data").logicalId, left.semanticSpec.datasets[0].logicalId);
  run.call.resolve(p); await run.settled; nested.destroy();
});

test("immediate cancellation skips producer work and a rejected late producer has no terminal callback", async () => {
  const p = base(), s = createInteractionSession({ program: p, bindings: [] }), events = []; let calls = 0;
  s.subscribe(e => events.push(e));
  s.updateProgram(() => { calls++; return p; }); const skipped = s.whenSettled(); s.dispatch({ type: "reset" });
  assert.equal((await skipped).status, "cancelled"); await tick(); assert.equal(calls, 0);
  const run = pending(s); await tick(); s.destroy(); const count = events.length;
  run.call.reject(new Error("late worker failure")); await tick(); assert.equal(events.length, count);
  assert.equal((await run.settled).status, "cancelled");
});

test("destroy requested by a throwing prepared-update subscriber releases every owned lease", async () => {
  const p = base(), s = createInteractionSession({ program: p, bindings: [] }); let request;
  s.subscribe(e => { if (e.type === "update" && e.status === "settled") { s.destroy(); throw new Error("host observer"); } });
  s.updateProgram(value => { request = value; return value.program; });
  await assert.rejects(s.whenSettled(), /host observer/); assert.equal(s.getState().destroyed, true); assert.equal(request.signal.aborted, true);
  assert.equal(s.getState().preparation, null); assert.equal(s.getState().assets, null);
});
