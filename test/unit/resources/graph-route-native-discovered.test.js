import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { action, registerExtension } from "../../../src/extension.js";
import { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutesAsync } from "../../../src/graph.js";
import { ROUTE_EXECUTION_MAXIMA } from "../../../src/grammar/graph/routes/execution.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";

const stale = error => getErrorDetails(error)?.code === "stale-result";
const execution = (patch = {}) => ({ policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA, ...patch });
const route = program => program.semanticSpec.resources.find(resource => resource.kind === "edge-route");
const commands = program => route(program).result.routes.map(value => value.commands);
const Full = chart().constructor;
// A registered extension action that reaches screen-space routes only through
// a nested original action.
registerExtension({ name: "route-test-widen", actions: {
  widenCanvas: action({ op: "widenCanvas", description: "Widen the Canvas." }, function (args) { return this.editCanvas({ width: args.width }); }),
  widenCanvasTwice: action({ op: "widenCanvasTwice", description: "Widen the Canvas in two steps." }, function (args) { return this.editCanvas({ width: args.width - 20 }).editCanvas({ width: args.width }); })
} });

function base() {
  return chart().createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "nodes", values: [{ id: 0 }, { id: 1 }, { id: 2 }] })
    .createData({ id: "edges", values: [{ id: "e", source: 0, target: 1 }, { id: "f", source: 1, target: 2 }] })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 0, x: 0, y: 0 }, { key: 1, x: 10, y: 10 }, { key: 2, x: 30, y: 5 }] } });
}
function executor(onPost = () => {}) {
  return createGraphRouteExecutor({ createWorker() {
    const listeners = new Map();
    return { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type), terminate: () => listeners.clear(),
      postMessage({ job }) { onPost(job); computeGraphEdgeRoutesAsync(structuredClone(job)).then(data => listeners.get("message")?.({ data }), error => listeners.get("error")?.({ error })); } };
  } });
}
const host = worker => ({ requestToken: "update", executor: worker, deadlineMs: 30000 });
async function bounded(worker, policy = execution(), coordinateSpace = "screen") {
  const program = base();
  const prepared = await prepareGraphEdgeRoutes(program, { kind: "create", id: "route", method: "edge-path", coordinateSpace, options: { execution: policy } }, { requestToken: "create", executor: worker, deadlineMs: 30000 });
  return program.bundleGraphEdges({ prepared, requestToken: "create" }).createGraphPlot({ id: "plot", routes: "route" });
}

test("any other public action is replayed and reaches its routes through its own nested native call", async () => {
  const posts = [], worker = executor(job => posts.push(job.inputHash));
  try {
    const ordinary = base().bundleGraphEdges({ id: "route", method: "edge-path", coordinateSpace: "screen" }).createGraphPlot({ id: "plot", routes: "route" }).widenCanvas({ width: 260 });
    const program = await bounded(worker), before = serializeProgram(program);
    assert.throws(() => program.widenCanvas({ width: 260 }), /Bounded routes require prepareGraphEdgeRoutes/);
    posts.length = 0;
    const prepared = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "widenCanvas", args: { width: 260 } } }, host(worker));
    assert.equal(posts.length, 1); assert.deepEqual(prepared.inputHashes, posts);
    assert.deepEqual(prepared.request, { kind: "update", action: "widenCanvas", args: { width: 260 } });
    const first = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" }), second = program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" });
    assert.equal(serializeProgram(program), before); assert.equal(serializeProgram(first), serializeProgram(second));
    assert.deepEqual(commands(first), commands(ordinary));
    assert.equal(first.graphicSpec.objects.canvas.properties.width, 260);
    assert.equal(first.trace.children.at(-1).op, "applyGraphEdgeRoutesUpdate"); assert.equal(first.trace.children.at(-1).children[0].op, "widenCanvas");
    assert.equal(posts.length, 1);
    // Registered extension actions cannot be replaced on the receiver.
    assert.equal(Object.getOwnPropertyDescriptor(Full.prototype, "widenCanvas").writable, false);
    assert.throws(() => program.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "other" }), stale);
  } finally { worker.dispose(); }
});

test("a replayed action is checked against the execution policy of every route it reaches", async () => {
  const worker = executor();
  try {
    // The smallest work budget that still creates the route cannot also pay for
    // the replayed preparation plus the final application that continues it.
    let low = 1, high = ROUTE_EXECUTION_MAXIMA.maxWork;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      try { await bounded(worker, execution({ maxWork: middle })); high = middle; } catch { low = middle + 1; }
    }
    const program = await bounded(worker, execution({ maxWork: low }));
    const tight = await prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "widenCanvas", args: { width: 260 } } }, host(worker));
    assert.throws(() => program.applyGraphEdgeRoutesUpdate({ prepared: tight, requestToken: "update" }), /Route work exceeds route route execution maxWork/);
    // An action that reaches the route twice is checked against its policy
    // during preparation, from the first job it reaches.
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "widenCanvasTwice", args: { width: 260 } } }, host(worker)),
      /Route work exceeds route route execution maxWork/);
    const roomy = await bounded(worker, execution({ maxWork: low * 100 }));
    const prepared = await prepareGraphEdgeRoutes(roomy, { kind: "update", edit: { action: "widenCanvas", args: { width: 260 } } }, host(worker));
    assert.equal(roomy.applyGraphEdgeRoutesUpdate({ prepared, requestToken: "update" }).graphicSpec.objects.canvas.properties.width, 260);
  } finally { worker.dispose(); }
});

test("public actions that reach no bounded route are used directly, and route actions are not updates", async () => {
  const worker = executor();
  try {
    const program = await bounded(worker), world = await bounded(worker, execution(), "world");
    for (const [receiver, edit] of [[program, { action: "applyTheme", args: { theme: "dark" } }], [program, { action: "editGraphPlot", args: { target: "plot", origin: [5, 5] } }],
      [world, { action: "widenCanvas", args: { width: 260 } }]]) {
      assert.doesNotThrow(() => receiver[edit.action](edit.args));
      await assert.rejects(prepareGraphEdgeRoutes(receiver, { kind: "update", edit }, host(worker)), new RegExp(`no bounded edge route update; use ${edit.action} directly`));
    }
    for (const action of ["bundleGraphEdges", "editEdgeRoute", "applyGraphEdgeRoutesUpdate", "notAnAction", "_assertUnitProgram", "semanticSpec"]) {
      await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action, args: {} } }, host(worker)), /Native route updates require editLayout/);
    }
    // A failing original action reports its own error and leaves no handle.
    await assert.rejects(prepareGraphEdgeRoutes(program, { kind: "update", edit: { action: "applyTheme", args: { theme: "absent" } } }, host(worker)), error => !/bounded edge route/.test(error.message));
  } finally { worker.dispose(); }
});
