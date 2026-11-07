import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { chart } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutes, computeGraphEdgeRoutesAsync } from "../../../src/graph.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { edgeRouteJob } from "../../../src/materialization/graph/routeResource.js";
import { normalizeRouteIntent, routeNumericOptions } from "../../../src/grammar/graph/routes/options.js";
import { createRouteLedger, ROUTE_EXECUTION_MAXIMA } from "../../../src/grammar/graph/routes/execution.js";
import { routeValueHash } from "../../../src/grammar/graph/routes/job.js";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";
import { registerGraphRoutePlanner } from "../../../src/resources/graphRoutes.js";
import { validateRouteResult } from "../../../src/grammar/graph/routes/result.js";
import { validateStoredResource } from "../../../src/materialization/resourceState.js";
const policy = (patch = {}) => ({ policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA, ...patch });
const get = (program, kind, id) => program.semanticSpec.resources.find(r => r.kind === kind && r.id === id);
function source() {
  return chart().createCanvas({ width: 200, height: 120 })
    .createData({ id: "n", values: [{ id: 0 }, { id: 1 }, { id: 2 }] })
    .createData({ id: "e", values: [{ id: 0, s: 0, t: 1 }, { id: 1, s: 1, t: 2 }] })
    .createGraphData({ id: "g", nodes: "n", edges: "e", nodeKey: "id", edgeKey: "id", source: "s", target: "t" })
    .layoutGraph({ id: "l", method: "fixed", options: { positions: [{ key: 0, x: -0, y: 0 }, { key: 1, x: 10, y: 10 }, { key: 2, x: 20, y: 0 }] } });
}
function hierarchySource() {
  let p = source().createData({ id: "tree", values: [{ id: "root", parent: null, v: 0 }, ...[0, 1, 2].map(id => ({ id, parent: "root", v: 1 }))] })
    .createHierarchyData({ id: "h", data: "tree", key: "id", parent: "parent", value: "v" })
    .layoutHierarchy({ id: "hl", method: "tree", options: { nodeSize: [1, 1], siblingGap: 1, depthGap: 10, orientation: "vertical" } });
  const positions = [0, 1, 2].map(key => { const node = get(p, "layout", "hl").result.nodes.find(x => x.key === encodeRowKey(key)); return { key, x: node.x, y: node.y }; });
  return p.editLayout({ target: "l", options: { positions } });
}
const request = (method = "edge-path", extra = {}) => ({ kind: "create", id: "r", graph: "g", layout: "l", method, options: { execution: policy(), ...(method === "hierarchical" ? { hierarchy: "h", hierarchyLayout: "hl", mapping: [0, 1, 2].map(nodeKey => ({ nodeKey, hierarchyKey: nodeKey })) } : {}) }, ...extra });
const host = executor => ({ executor, requestToken: "t", deadlineMs: 30000 });
function controlled(auto = false) {
  const workers = [];
  const executor = createGraphRouteExecutor({ createWorker() {
    const listeners = new Map();
    const worker = { listeners, terminated: 0, job: undefined,
      postMessage({ job }) {
        this.job = structuredClone(job);
        if (auto) computeGraphEdgeRoutesAsync(this.job).then(data => this.complete(data), error => this.fail(error));
      },
      addEventListener(type, listener) { listeners.set(type, listener); }, removeEventListener(type) { listeners.delete(type); },
      terminate() { this.terminated++; }, complete(data) { listeners.get("message")?.({ data }); }, fail(error) { listeners.get("error")?.({ error }); }
    };
    workers.push(worker); return worker;
  } });
  return { executor, workers };
}
async function posted(workers) {
  for (let i = 0; i < 1000 && !workers.length; i++) await new Promise(resolve => setTimeout(resolve, 1));
  assert.equal(workers.length, 1); return workers[0];
}

test("bounded native create/edit/restore preserves every method and exact mathematical route", async () => {
  for (const method of ["edge-path", "force-directed", "density", "hierarchical"]) for (const coordinateSpace of ["world", "screen"]) {
    const p = method === "hierarchical" ? hierarchySource() : source(), before = serializeProgram(p), run = controlled(true);
    try {
      const input = request(method, { coordinateSpace });
      const ordinary = { ...input, options: { ...input.options } }; delete ordinary.kind; delete ordinary.options.execution;
      const expected = get(p.bundleGraphEdges(ordinary), "edge-route", "r");
      assert.throws(() => p.bundleGraphEdges({ ...ordinary, options: input.options }), /prepareGraphEdgeRoutes/);
      const pending = prepareGraphEdgeRoutes(p, input, host(run.executor));
      input.options.execution.maxWork = 1;
      const prepared = await pending;
      const applied = p.bundleGraphEdges({ prepared, requestToken: "t" }), route = get(applied, "edge-route", "r");
      assert.equal(route.algorithmVersion, "2"); assert.deepEqual(route.result.routes, expected.result.routes);
      assert.ok(route.result.diagnostics.work >= expected.result.diagnostics.work);
      assert.equal(route.result.resultHash, routeValueHash({ complete: route.result.complete, routes: route.result.routes, diagnostics: route.result.diagnostics, options: routeNumericOptions(expected.options) }));
      assert.deepEqual(deserializeProgram(serializeProgram(applied)).semanticSpec, applied.semanticSpec);
      assert.equal(serializeProgram(p), before);
      const edit = await prepareGraphEdgeRoutes(applied, { kind: "edit", target: "r", options: { zeroLength: "point" } }, host(run.executor));
      assert.equal(get(applied.editEdgeRoute({ prepared: edit, requestToken: "t" }), "edge-route", "r").revision, 1);
      for (const worker of run.workers) { assert.equal(worker.terminated, 1); assert.equal(worker.listeners.size, 0); }
      assert.throws(() => p.bundleGraphEdges({ prepared: { ...prepared }, requestToken: "t" }), /authentic/);
      assert.throws(() => p.bundleGraphEdges({ prepared, requestToken: "other" }), /receiver|token/);
      assert.throws(() => applied.bundleGraphEdges({ prepared, requestToken: "t" }), /receiver|token/);
      assert.throws(() => p.editEdgeRoute({ prepared, requestToken: "t" }), /action/);
    } finally { run.executor.dispose(); }
  }
});

test("one real worker executes the explicit async entry and releases its host lifetime", async () => {
  const moduleURL = new URL("../../../src/graph.js", import.meta.url).href;
  const code = `import {parentPort} from 'node:worker_threads';import{computeGraphEdgeRoutesAsync}from ${JSON.stringify(moduleURL)};parentPort.on('message',async({job})=>{try{parentPort.postMessage(await computeGraphEdgeRoutesAsync(job))}catch(error){throw error}});`;
  let terminated = 0, listeners = 0;
  const executor = createGraphRouteExecutor({ createWorker() {
    const worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(code)}`)), adapters = new Map();
    return { postMessage: value => worker.postMessage(value),
      addEventListener(type, fn) { const adapted = type === "message" ? data => fn({ data }) : error => fn({ error }); adapters.set(fn, adapted); worker.on(type, adapted); listeners++; },
      removeEventListener(type, fn) { worker.off(type, adapters.get(fn)); adapters.delete(fn); listeners--; }, terminate() { terminated++; worker.terminate(); }
    };
  } });
  try {
    const p = source(), prepared = await prepareGraphEdgeRoutes(p, request(), host(executor));
    assert.equal(get(p.bundleGraphEdges({ prepared, requestToken: "t" }), "edge-route", "r").algorithmVersion, "2");
    assert.equal(terminated, 1); assert.equal(listeners, 0);
  } finally { executor.dispose(); }
});

test("bounded completions are snapshotted before suspension and reject altered headers and geometry", async () => {
  const p = source();
  for (const mode of ["mutation", "schema", "hash", "geometry", "getter", "nested-getter", "error"]) {
    const run = controlled();
    try {
      const pending = prepareGraphEdgeRoutes(p, request(), host(run.executor)), rejected = mode === "mutation" ? undefined : assert.rejects(pending);
      const worker = await posted(run.workers), completion = structuredClone(await computeGraphEdgeRoutesAsync(worker.job));
      const listener = worker.listeners.get("message");
      if (mode === "schema") completion.schemaVersion = 1;
      if (mode === "hash") completion.resultHash = "0".repeat(64);
      if (mode === "geometry") completion.result.routes[0].commands[0].x++;
      let reads = 0;
      if (mode === "getter") Object.defineProperty(completion.result.routes[0], "bounds", { get() { reads++; throw Error("getter ran"); }, enumerable: true });
      if (mode === "nested-getter") completion.result.routes[0].bounds.left = { get value() { reads++; throw Error("getter ran"); } };
      if (mode === "error") worker.fail("failure"); else worker.complete(completion);
      if (mode === "mutation") { completion.result.routes[0].commands[0].x = 999; const prepared = await pending; assert.notEqual(get(p.bundleGraphEdges({ prepared, requestToken: "t" }), "edge-route", "r").result.routes[0].commands[0].x, 999); }
      else await rejected;
      assert.equal(reads, 0); assert.equal(worker.terminated, 1); assert.equal(worker.listeners.size, 0);
      listener({ get data() { throw Error("late packet read"); } });
    } finally { run.executor.dispose(); }
  }
});

test("bounded worker cancellation, deadline, disposal and exclusive admission leave no result", async () => {
  for (const mode of ["abort", "deadline", "dispose", "hash-abort"]) {
    const p = source(), run = controlled(), controller = new AbortController();
    const reason = Error("cancel bounded");
    try {
      const promise = prepareGraphEdgeRoutes(p, request(), { ...host(run.executor), signal: controller.signal, deadlineMs: mode === "deadline" ? 500 : 30000 });
      const rejection = assert.rejects(promise, mode === "deadline" ? /deadline/ : mode === "dispose" ? /disposed/ : error => error === reason);
      const worker = await posted(run.workers);
      if (mode === "abort") controller.abort(reason);
      if (mode === "dispose") run.executor.dispose();
      if (mode === "hash-abort") { worker.complete(await computeGraphEdgeRoutesAsync(worker.job)); controller.abort(reason); }
      await rejection;
      assert.equal(worker.terminated, 1); assert.equal(worker.listeners.size, 0);
      assert.equal(get(p, "edge-route", "r"), undefined);
    } finally { run.executor.dispose(); }
  }
  const p = source(), run = controlled();
  try {
    const pending = prepareGraphEdgeRoutes(p, request(), host(run.executor)), rejection = assert.rejects(pending, /disposed/);
    const worker = await posted(run.workers);
    await assert.rejects(run.executor.compute(worker.job, { deadlineMs: 1000 }), /idle/);
    const v1 = edgeRouteJob(p, get(p, "graph", "g"), get(p, "layout", "l"), normalizeRouteIntent("edge-path"));
    await assert.rejects(run.executor.compute(v1), /pending bounded/);
    run.executor.dispose(); await rejection;
  } finally { run.executor.dispose(); }
});

test("v2 policy/version/worker admission is closed and v1 synchronous computation is unchanged", async () => {
  const p = source(), run = controlled(true), fallback = createGraphRouteExecutor();
  try {
    for (const options of [{ requestToken: "t" }, { requestToken: "t", executor: run.executor }, { ...host(run.executor), deadlineMs: 0 }, { ...host(run.executor), deadlineMs: 30001 }, host(fallback)]) await assert.rejects(prepareGraphEdgeRoutes(p, request(), options));
    await assert.rejects(prepareGraphEdgeRoutes(basicChart(), request(), host(run.executor)), /Full/);
    const job = edgeRouteJob(p, get(p, "graph", "g"), get(p, "layout", "l"), normalizeRouteIntent("edge-path", { execution: policy() }));
    assert.throws(() => computeGraphEdgeRoutes(job), /Async/);
    const completion = await computeGraphEdgeRoutesAsync(job);
    assert.deepEqual(await computeGraphEdgeRoutesAsync(structuredClone(job)), completion);
    const mutableJob = structuredClone(job), inFlight = computeGraphEdgeRoutesAsync(mutableJob);
    mutableJob.input.positions[0].x = 999; mutableJob.intent.options.execution.maxWork = 1;
    assert.deepEqual(await inFlight, completion);
    const v1 = edgeRouteJob(p, get(p, "graph", "g"), get(p, "layout", "l"), normalizeRouteIntent("edge-path"));
    assert.equal(computeGraphEdgeRoutes(v1).result.complete, true);
    await assert.rejects(computeGraphEdgeRoutesAsync(v1));
    const copy = structuredClone(job); copy.input.limits = copy.intent.options.limits;
    await assert.rejects(computeGraphEdgeRoutesAsync(copy), /limits/);
    const prepared = await prepareGraphEdgeRoutes(p, request(), host(run.executor));
    const applied = p.bundleGraphEdges({ prepared, requestToken: "t" }), resource = get(applied, "edge-route", "r");
    for (const version of ["1", "3", 2]) assert.throws(() => validateStoredResource({ ...resource, algorithmVersion: version }, applied.constructor));
    assert.throws(() => validateStoredResource(resource, basicChart().constructor), /registered/);
    assert.throws(() => validateStoredResource(resource, class Unregistered {}), /registered/);
    const noExecution = structuredClone(resource); delete noExecution.options.options.execution;
    assert.throws(() => validateStoredResource(noExecution, applied.constructor), /version/);
    const graph = get(p, "graph", "g"); assert.throws(() => validateStoredResource({ ...graph, algorithmVersion: "2" }, p.constructor), /version/);
    await assert.rejects(prepareGraphEdgeRoutes(applied, { kind: "edit", target: "r", method: "density" }, host(run.executor)), /explicit execution/);
    const ordinary = { ...request(), options: {} }; await assert.rejects(prepareGraphEdgeRoutes(p, ordinary, host(run.executor)), /deadlineMs/);
    let reads = 0; const hostile = { get schemaVersion() { reads++; throw Error("getter"); } };
    await assert.rejects(computeGraphEdgeRoutesAsync(hostile), /accessor/); assert.equal(reads, 0);
    const aborted = AbortSignal.abort(Error("early")); await assert.rejects(computeGraphEdgeRoutesAsync(hostile, aborted), /early/); assert.equal(reads, 0);
  } finally { run.executor.dispose(); fallback.dispose(); }
});

test("native application plans preserve consumer traces and repeatable aggregate admission", async () => {
  const run = controlled(true), p = source();
  try {
    const prepared = await prepareGraphEdgeRoutes(p, request(), host(run.executor));
    const routed = p.bundleGraphEdges({ prepared, requestToken: "t" });
    assert.deepEqual(p.bundleGraphEdges({ prepared, requestToken: "t" }).semanticSpec, routed.semanticSpec);
    const plotted = routed.createGraphPlot({ id: "one", routes: "r", nodes: { radius: 1 } })
      .createGraphPlot({ id: "two", routes: "r", nodes: { radius: 2 } });
    const snapshot = serializeProgram(plotted);
    const edit = await prepareGraphEdgeRoutes(plotted, { kind: "edit", target: "r", options: { exponent: 3 } }, host(run.executor));
    const next = plotted.editEdgeRoute({ prepared: edit, requestToken: "t" });
    const count = (trace, op) => Number(trace.op === op) + trace.children.reduce((total, child) => total + count(child, op), 0);
    const trace = next.trace.children.at(-1);
    assert.equal(trace.op, "editEdgeRoute"); assert.equal(trace.children[0].op, "editSemantic");
    assert.equal(count(trace, "materializeGraphPlot"), 2);
    assert.deepEqual(next.semanticSpec.layers.map(layer => layer.graphBinding.routes.revision), [1, 1]);
    assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
    assert.equal(serializeProgram(plotted), snapshot);
    assert.deepEqual(plotted.editEdgeRoute({ prepared: edit, requestToken: "t" }).graphicSpec, next.graphicSpec);
  } finally { run.executor.dispose(); }
});

test("bounded worker factories and cleanup fail atomically without retaining live callbacks", async () => {
  const p = source(), job = edgeRouteJob(p, get(p, "graph", "g"), get(p, "layout", "l"), normalizeRouteIntent("edge-path", { execution: policy() }));
  for (const mode of ["factory", "invalid", "factory-abort", "factory-dispose", "post", "cleanup", "error-object", "error-getter", "duplicate"]) {
    const controller = new AbortController(), listeners = new Map(), failure = Error(mode);
    let executor, terminated = 0;
    executor = createGraphRouteExecutor({ createWorker() {
      if (mode === "factory") throw failure;
      if (mode === "invalid") return null;
      if (mode === "factory-abort") controller.abort(failure);
      if (mode === "factory-dispose") executor.dispose();
      return {
        addEventListener: (type, fn) => listeners.set(type, fn),
        removeEventListener(type) { listeners.delete(type); if (mode === "cleanup") throw failure; },
        terminate() { terminated++; },
        postMessage() {
          if (mode === "post") throw failure;
          if (mode === "error-getter") { listeners.get("error")({ get error() { throw failure; } }); return; }
          if (mode === "error-object") { listeners.get("error")({ error: failure }); return; }
          computeGraphEdgeRoutesAsync(job).then(data => {
            const callback = listeners.get("message"); callback({ data });
            if (mode === "duplicate") callback({ get data() { throw Error("duplicate completion read"); } });
          });
        }
      };
    } });
    try {
      const pending = executor.compute(job, { deadlineMs: 30000, signal: controller.signal });
      if (mode === "duplicate") assert.equal((await pending).schemaVersion, 2);
      else await assert.rejects(pending, mode === "invalid" ? /requires message/ : mode === "factory-dispose" ? /disposed/ : error => error === failure);
      assert.equal(listeners.size, 0);
      assert.equal(terminated, ["factory", "invalid"].includes(mode) ? 0 : 1);
    } finally { executor.dispose(); }
  }
});


test("request work includes native preparation, both completion checks, closure preflight and final primitive validation", async () => {
  const p = source(), execution = policy(), ledger = createRouteLedger(execution);
  const job = edgeRouteJob(p, get(p, "graph", "g"), get(p, "layout", "l"), normalizeRouteIntent("edge-path", { execution }), undefined, undefined, { execution, ledger });
  const jobWork = ledger.diagnostics().work;
  const completion = await computeGraphEdgeRoutesAsync(job), validation = createRouteLedger(execution);
  validateRouteResult(job, completion, { execution, ledger: validation, includeComputation: false });
  const resultWork = validation.diagnostics().work, workerWork = completion.result.diagnostics.work;
  const prepareWork = 3 * jobWork + workerWork + 4 * resultWork, applyWork = prepareWork + jobWork + resultWork;
  assert.ok(jobWork > 0 && resultWork > jobWork && workerWork > jobWork);
  for (const [maximum, stage] of [[prepareWork - 1, "prepare"], [applyWork - 1, "apply"], [applyWork, "success"]]) {
    const run = controlled(true), before = serializeProgram(p);
    try {
      const input = request(); input.options.execution.maxWork = maximum;
      const pending = prepareGraphEdgeRoutes(p, input, host(run.executor));
      if (stage === "prepare") await assert.rejects(pending, /maxWork/);
      else {
        const prepared = await pending;
        if (stage === "apply") assert.throws(() => p.bundleGraphEdges({ prepared, requestToken: "t" }), /maxWork/);
        else {
          assert.equal(get(p.bundleGraphEdges({ prepared, requestToken: "t" }), "edge-route", "r").algorithmVersion, "2");
          assert.equal(get(p.bundleGraphEdges({ prepared, requestToken: "t" }), "edge-route", "r").revision, 0);
        }
      }
      assert.equal(serializeProgram(p), before);
      for (const worker of run.workers) { assert.equal(worker.terminated, 1); assert.equal(worker.listeners.size, 0); }
    } finally { run.executor.dispose(); }
  }
});


test("native planner binding is private, once-only and exact-constructor isolated", async () => {
  const p = source(), run = controlled(true);
  class Unregistered extends p.constructor {}
  class BoundOnly extends p.constructor {}
  let calls = 0;
  registerGraphRoutePlanner(BoundOnly, () => { calls++; });
  assert.throws(() => registerGraphRoutePlanner(BoundOnly, () => {}), /already/);
  assert.throws(() => registerGraphRoutePlanner(p.constructor, () => {}), /already/);
  for (const [constructor, planner] of [[null, () => {}], [() => {}, () => {}], [class A {}, null]]) assert.throws(() => registerGraphRoutePlanner(constructor, planner), /constructor/);
  try {
    await assert.rejects(prepareGraphEdgeRoutes(new Unregistered(), request(), host(run.executor)), /Full/);
    await assert.rejects(prepareGraphEdgeRoutes(new BoundOnly(), request(), host(run.executor)), /Full/);
    assert.equal(calls, 0); assert.equal(run.workers.length, 0);
  } finally { run.executor.dispose(); }
});


test("v1 unknown deadline errors retain their original order before token, abort and request validation", async () => {
  const p = source(), signal = AbortSignal.abort(Error("aborted"));
  for (const input of [{kind:"create",id:"r",method:"edge-path"},{kind:"edit",target:"absent",options:{exponent:3}},{kind:"create",options:null}]) {
    await assert.rejects(prepareGraphEdgeRoutes(p,input,{requestToken:"",signal,deadlineMs:1}), /Unknown.*deadlineMs/);
  }
});

test("a received completion is checked in one turn before its snapshot while an owned one yields between route batches", async () => {
  const { validateRouteResultStages } = await import("../../../src/grammar/graph/routes/result.js");
  const { cloneAndFreeze } = await import("../../../src/core/immutable.js");
  const count = 600, nodes = Array.from({ length: count }, (_, id) => ({ id }));
  const p = chart().createCanvas({ width: 200, height: 120 }).createData({ id: "n", values: nodes })
    .createData({ id: "e", values: nodes.map(({ id }) => ({ id, s: id, t: (id + 1) % count })) })
    .createGraphData({ id: "g", nodes: "n", edges: "e", nodeKey: "id", edgeKey: "id", source: "s", target: "t" })
    .layoutGraph({ id: "l", method: "fixed", options: { positions: nodes.map(({ id }) => ({ key: id, x: id % 30, y: Math.floor(id / 30) })) } });
  const run = controlled();
  try {
    const pending = prepareGraphEdgeRoutes(p, request(), host(run.executor));
    const worker = await posted(run.workers), job = worker.job, completion = await computeGraphEdgeRoutesAsync(structuredClone(job));
    const turns = envelope => {
      const stages = validateRouteResultStages(job, envelope, { includeComputation: false });
      let total = 0;
      for (let step = stages.next(); !step.done; step = stages.next()) total++;
      return total;
    };
    // Both run every check; only the owned copy may also pause inside the
    // geometry check, since nothing it reads can change while suspended.
    const received = turns(structuredClone(completion)), owned = turns(cloneAndFreeze(structuredClone(completion)));
    assert.ok(owned > received, `${owned} > ${received}`);
    worker.complete(completion);
    const prepared = await pending;
    assert.equal(get(p.bundleGraphEdges({ prepared, requestToken: "t" }), "edge-route", "r").result.routes.length, count);
  } finally { run.executor.dispose(); }
});

test("the synchronous edge-route binding check drains the same staged checks", async () => {
  const { getBuiltinResourceKindHandler } = await import("../../../src/materialization/resourceKinds.js");
  const { cloneAndFreeze } = await import("../../../src/core/immutable.js");
  const handler = getBuiltinResourceKindHandler(chart().constructor, "edge-route"), run = controlled(true);
  try {
    for (const bounded of [true, false]) {
      const p = source(), input = request("edge-path");
      if (!bounded) delete input.options.execution;
      const prepared = await prepareGraphEdgeRoutes(p, input, bounded ? host(run.executor) : { requestToken: "t" });
      const program = p.bundleGraphEdges({ prepared, requestToken: "t" }), resource = get(program, "edge-route", "r");
      assert.doesNotThrow(() => handler.validateBindings(program, resource));
      const stages = handler.validateBindingsStages(program, resource);
      for (let step = stages.next(); !step.done; step = stages.next());
      const moved = cloneAndFreeze({ ...resource, provenance: { ...resource.provenance, sourceRows: resource.provenance.sourceRows.slice(1) } });
      assert.throws(() => handler.validateBindings(program, moved), /viewport or source provenance is stale/);
    }
  } finally { run.executor.dispose(); }
});

test("a received completion changed while its staged check is suspended keeps the snapshot it was checked on", async () => {
  const { validateRouteResultStages } = await import("../../../src/grammar/graph/routes/result.js");
  const run = controlled();
  try {
    const pending = prepareGraphEdgeRoutes(source(), request(), host(run.executor));
    const worker = await posted(run.workers), job = worker.job, completion = await computeGraphEdgeRoutesAsync(structuredClone(job));
    const original = completion.result.routes[0].commands[0].x, received = structuredClone(completion);
    const stages = validateRouteResultStages(job, received, { includeComputation: false });
    let step = stages.next(), turns = 0;
    for (; !step.done; step = stages.next()) {
      turns++;
      received.result.routes[0].commands[0].x = 999; received.resultHash = "0".repeat(64); received.result.routes.length = 0;
    }
    assert.ok(turns > 0);
    assert.equal(step.value.result.routes[0].commands[0].x, original); assert.equal(step.value.resultHash, completion.resultHash);
    worker.complete(completion); await pending;
  } finally { run.executor.dispose(); }
});
